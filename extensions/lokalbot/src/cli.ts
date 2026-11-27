import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { Toast, getPreferenceValues, open, showToast } from "@raycast/api";

const execFileAsync = promisify(execFile);

export const FALLBACK_CLI =
  "/Applications/LokalBot.app/Contents/Helpers/lokalbot-cli";

export class CliMissingError extends Error {}

export async function resolveCli(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  for (const candidate of [prefs.cliPath || "lokalbot-cli", FALLBACK_CLI]) {
    try {
      await execFileAsync(candidate, ["--help"], { timeout: 5_000 });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      return candidate;
    }
  }
  throw new CliMissingError("lokalbot-cli not found");
}

export async function runCli<T>(...args: string[]): Promise<T> {
  let cli: string;
  try {
    cli = await resolveCli();
  } catch {
    throw new CliMissingError(
      "Install LokalBot — https://github.com/stevyhacker/lokalbot/releases",
    );
  }
  const { stdout } = await execFileAsync(cli, args, {
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

export async function runCliPath(...args: string[]): Promise<string> {
  const cli = await resolveCli();
  const { stdout } = await execFileAsync(cli, args);
  return stdout.trim();
}

export async function revealMeeting(meetingId: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Locating meeting…",
  });
  try {
    const folder = await runCliPath("path", meetingId);
    if (folder) {
      await open(folder);
      toast.hide();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No files found for this meeting";
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not reveal in Finder";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

export class CliOutdatedError extends Error {}

export interface AskSource {
  meeting_id: string;
  title: string;
  date: string;
}

export interface AskOutcome {
  status: "answered" | "not_found" | "error";
  code?: string;
  text: string;
  sources: AskSource[];
}

export async function runAsk(
  args: string[],
  options: { input?: string; signal?: AbortSignal } = {},
): Promise<AskOutcome> {
  let cli: string;
  try {
    cli = await resolveCli();
  } catch {
    throw new CliMissingError(
      "Install LokalBot — https://github.com/stevyhacker/lokalbot/releases",
    );
  }
  return runAskWith(cli, args, options);
}

export function runAskWith(
  cli: string,
  args: string[],
  options: { input?: string; signal?: AbortSignal } = {},
): Promise<AskOutcome> {
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { signal: options.signal });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);
    child.stdin.on("error", () => undefined);
    child.on("close", () => {
      try {
        resolve(JSON.parse(stdout) as AskOutcome);
      } catch {
        if (/Unexpected argument '(ask|reply)'/.test(stderr)) {
          reject(
            new CliOutdatedError(
              "Update LokalBot to the latest version to ask it from Raycast.",
            ),
          );
        } else {
          reject(
            new Error(stderr.trim() || "lokalbot-cli returned no answer."),
          );
        }
      }
    });
    child.stdin.end(options.input ?? "");
  });
}

export function describeAskError(outcome: AskOutcome): {
  title: string;
  message: string;
} {
  switch (outcome.code) {
    case "access_disabled":
      return {
        title: "Turn on meeting library access",
        message:
          "In LokalBot, open Settings → External Agents (Privacy → External agents in earlier versions), turn on “Allow external agents to read your LokalBot data”, and tick Meetings.",
      };
    case "app_not_running":
      return {
        title: "Open LokalBot",
        message:
          "Answers use LokalBot's local model, so the LokalBot app needs to be running. Open it and try again.",
      };
    case "model_loading_timeout":
      return {
        title: "The model is still loading",
        message:
          "The first question after LokalBot starts takes the longest. Try again in a moment.",
      };
    default:
      return { title: "LokalBot could not answer", message: outcome.text };
  }
}
