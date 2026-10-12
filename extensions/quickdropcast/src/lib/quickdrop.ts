import { t } from "./i18n/runtime";
import { LocalizedError, nativeErrorKey } from "./i18n/messages";
import {
  closeMainWindow,
  environment,
  getApplications,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { ShareRequest } from "./payload";

const bundleId = "com.leonboettger.neardrop";
export async function ensureQuickDrop() {
  const app = (await getApplications()).find(
    (item) => item.bundleId === bundleId,
  );
  if (!app) throw new LocalizedError("install");
  return app;
}

export async function share(request: ShareRequest): Promise<void> {
  await ensureQuickDrop();
  const helper = join(
    environment.assetsPath,
    "QuickDropcastBridge.app",
    "Contents",
    "MacOS",
    "QuickDropcastBridge",
  );
  await access(helper, constants.X_OK).catch(() => {
    throw new LocalizedError("missingHelper");
  });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(helper, [], {
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let ready = false;
    // Do not log clipboard content or propagate arbitrary native stderr.
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (output.length < 8192) output += chunk;
      if (ready) return;
      for (const line of output.split("\n").slice(0, -1)) {
        try {
          if (JSON.parse(line).status !== "ready") continue;
        } catch {
          continue;
        }
        ready = true;
        // Resetting Raycast can unload this command. Wait until the native UI is running.
        void closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        }).catch(reject);
        break;
      }
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    const timeout = setTimeout(() => {
      child.kill();
      reject(new LocalizedError("timeout"));
    }, 600_000);
    child.once("error", () => {
      clearTimeout(timeout);
      reject(new LocalizedError("helperFailed"));
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      try {
        const result = JSON.parse(output.trim().split("\n").at(-1) || "") as {
          status: string;
          errorCode?: string;
        };
        if (!result || typeof result.status !== "string")
          throw new LocalizedError("invalidResponse");
        if (code === 0 && result.status === "cancelled") return resolve();
        if (code !== 0 || result.status !== "shared")
          throw new LocalizedError(nativeErrorKey(result.errorCode));
        resolve();
      } catch (error) {
        reject(
          error instanceof LocalizedError
            ? error
            : new LocalizedError("invalidResponse"),
        );
      }
    });
    child.stdin.end(
      JSON.stringify({
        ...request,
        instruction: t("instruction"),
        shareFailureMessage: t("shareFailed"),
      }),
    );
  });
}

export async function reportError(error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: "QuickDropcast",
    message: error instanceof LocalizedError ? t(error.key) : t("unknownError"),
  });
}
