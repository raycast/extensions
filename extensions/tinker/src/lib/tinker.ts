import {
  Application,
  closeMainWindow,
  getApplications,
  open,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const TINKER_BUNDLE_ID = "app.tinker.Tinker";
const COMMAND_PROTOCOL_VERSION = 1;
const RESPONSE_POLL_INTERVAL_MS = 50;
const RESPONSE_TIMEOUT_MS = 3_000;

export type TinkerCommand = "record-area" | "record-last-area";

type CommandResponse = {
  request_id: string;
  status: "completed" | "rejected" | "failed";
  code: string;
  message: string;
};

class ResponseTimeoutError extends Error {}

type DispatchOptions = {
  command: TinkerCommand;
};

export async function dispatchTinkerCommand({ command }: DispatchOptions): Promise<void> {
  try {
    const application = await findTinkerApplication();
    if (!application) {
      await showTinkerNotInstalledToast();
      return;
    }

    const url = buildCommandURL(command);
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    await open(url, application);
  } catch (error) {
    console.error(`Could not dispatch ${command} to Tinker`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Tinker",
      message: "Launch Tinker once and try again.",
    });
  }
}

export async function copyLatestRecording(): Promise<void> {
  try {
    const application = await findTinkerApplication();
    if (!application) {
      await showTinkerNotInstalledToast();
      return;
    }

    const requestID = randomUUID();
    const responsePath = join(tmpdir(), TINKER_BUNDLE_ID, "command-responses", `${requestID.toLowerCase()}.json`);
    const url = buildCopyLatestURL(requestID);

    await rm(responsePath, { force: true });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    await open(url, application);

    try {
      const response = await waitForResponse(responsePath, requestID);
      switch (response.status) {
        case "completed":
          await showHUD(response.message, {
            clearRootSearch: true,
            popToRootType: PopToRootType.Immediate,
          });
          return;
        case "rejected":
        case "failed":
          await showToast({
            style: Toast.Style.Failure,
            title: response.message,
            message: response.code,
          });
          return;
        default: {
          const unexpectedStatus: never = response.status;
          throw new Error(`Unexpected Tinker response status: ${unexpectedStatus}`);
        }
      }
    } catch (error) {
      if (error instanceof ResponseTimeoutError) {
        await showHUD("Asked Tinker to copy the latest recording", {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("Could not confirm Tinker clipboard copy", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not confirm clipboard copy",
      message: "Open Tinker and try again.",
    });
  }
}

function buildCommandURL(command: TinkerCommand): string {
  const url = new URL(`tinker://command/${command}`);
  url.searchParams.set("source", "raycast");
  url.searchParams.set("version", String(COMMAND_PROTOCOL_VERSION));
  return url.toString();
}

function buildCopyLatestURL(requestID: string): string {
  const url = new URL("tinker://command/copy-latest");
  url.searchParams.set("source", "raycast");
  url.searchParams.set("version", String(COMMAND_PROTOCOL_VERSION));
  url.searchParams.set("request_id", requestID);
  return url.toString();
}

async function waitForResponse(path: string, requestID: string): Promise<CommandResponse> {
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
  let lastValidationError: Error | undefined;

  while (Date.now() < deadline) {
    let contents: string;
    try {
      contents = await readFile(path, "utf8");
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
      await sleep(RESPONSE_POLL_INTERVAL_MS);
      continue;
    }

    let response: CommandResponse;
    try {
      response = parseCommandResponse(contents);
    } catch (error) {
      lastValidationError = error instanceof Error ? error : new Error("Tinker returned an invalid command response");
      await sleep(RESPONSE_POLL_INTERVAL_MS);
      continue;
    }

    if (response.request_id.toLowerCase() !== requestID.toLowerCase()) {
      lastValidationError = new Error("Tinker returned a mismatched command response ID");
      await sleep(RESPONSE_POLL_INTERVAL_MS);
      continue;
    }
    await rm(path, { force: true });
    return response;
  }

  throw lastValidationError ?? new ResponseTimeoutError("Timed out waiting for Tinker");
}

function parseCommandResponse(value: string): CommandResponse {
  const response: unknown = JSON.parse(value);
  if (
    typeof response !== "object" ||
    response === null ||
    !("request_id" in response) ||
    typeof response.request_id !== "string" ||
    !("status" in response) ||
    (response.status !== "completed" && response.status !== "rejected" && response.status !== "failed") ||
    !("code" in response) ||
    typeof response.code !== "string" ||
    !("message" in response) ||
    typeof response.message !== "string"
  ) {
    throw new Error("Tinker returned an invalid command response");
  }
  return response as CommandResponse;
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function showTinkerNotInstalledToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Tinker is not installed",
    message: "Install Tinker from tinker.video, then run this command again.",
  });
}

async function findTinkerApplication(): Promise<Application | undefined> {
  const applications = await getApplications();
  return applications.find((application) => application.bundleId === TINKER_BUNDLE_ID);
}
