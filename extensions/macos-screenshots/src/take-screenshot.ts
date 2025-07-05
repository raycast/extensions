import { showToast, Toast, showHUD, getPreferenceValues, Clipboard } from "@raycast/api";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import FormData from "form-data";
import fetch from "node-fetch";
import { getApiKey } from "./utils/api-key";
import { detectWallpaperOnlyScreenshot, showPermissionInstructions } from "./utils/permissions";

interface Preferences {
  apiKey: string;
  baseUrl: string;
  screenshotMode: "area" | "window" | "screen";
  showPreview: boolean;
  includePointer: boolean;
  soundEnabled: boolean;
  apiUrl?: string;
}

export default async function TakeScreenshot() {
  try {
    const apiKey = await getApiKey();

    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No API Key",
        message: "Please set your API key first using 'Set API Key' command",
      });
      return;
    }

    const preferences = getPreferenceValues<Preferences>();
    const mode = preferences.screenshotMode || "area";
    const includePointer = preferences.includePointer || false;
    const soundEnabled = preferences.soundEnabled !== false;
    const apiUrl = preferences.apiUrl || "https://api.pain.is/v1";
    const baseUrl = preferences.baseUrl || "https://beta.pain.is";

    await showToast({
      style: Toast.Style.Animated,
      title: "Taking Screenshot",
      message: `${mode} mode`,
    });

    const tempFile = join(tmpdir(), `screenshot-${Date.now()}.png`);

    const screencapturePath = "/usr/sbin/screencapture";

    if (!existsSync(screencapturePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Tool Not Found",
        message: "screencapture command not found",
      });
      return;
    }

    const screencaptureArgs = [];

    if (!soundEnabled) {
      screencaptureArgs.push("-x");
    }

    if (includePointer) {
      screencaptureArgs.push("-C");
    }

    switch (mode) {
      case "area":
        screencaptureArgs.push("-s");
        break;
      case "window":
        screencaptureArgs.push("-w");
        break;
      case "screen":
        break;
    }

    screencaptureArgs.push(tempFile);

    try {
      execSync(`"${screencapturePath}" ${screencaptureArgs.join(" ")}`, {
        stdio: "pipe",
        timeout: 5000,
        encoding: "utf8",
      });
    } catch (error: unknown) {
      const errorObj = error as {
        status?: number;
        stderr?: Buffer;
        stdout?: Buffer;
        message?: string;
        signal?: string;
        code?: string;
      };
      const exitCode = errorObj.status || "unknown";

      if (errorObj.message?.includes("ETIMEDOUT") || errorObj.signal === "SIGTERM" || errorObj.code === "ETIMEDOUT") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Screenshot Timed Out",
          message:
            mode === "area"
              ? "Selection took too long. Please select faster."
              : mode === "window"
                ? "Window selection took too long. Please click faster."
                : "Screenshot timed out.",
        });
        return;
      }

      if (exitCode === 1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Screenshot Cancelled",
          message: "Screenshot was cancelled",
        });
        return;
      }

      if (exitCode === 127) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Command Not Found",
          message: "screencapture command not found",
        });
        return;
      }

      if (exitCode === 2) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Permission Denied",
          message: "Screenshot permission denied. Please check Screen Recording permissions.",
          primaryAction: {
            title: "Fix Permissions",
            onAction: async () => {
              await showPermissionInstructions();
            },
          },
        });
        return;
      }

      const stderr = errorObj.stderr ? errorObj.stderr.toString() : "";
      const errorMessage = stderr || errorObj.message || "Unknown error";

      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Failed",
        message: `Error: ${errorMessage}`,
        primaryAction: {
          title: "Check Permissions",
          onAction: async () => {
            await showPermissionInstructions();
          },
        },
      });
      return;
    }

    if (!existsSync(tempFile)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Failed",
        message:
          mode === "area"
            ? "No area was selected"
            : mode === "window"
              ? "No window was selected"
              : "Screenshot file was not created",
      });
      return;
    }

    let imageBuffer: Buffer;
    try {
      imageBuffer = readFileSync(tempFile);

      const mightBeWallpaperOnly = detectWallpaperOnlyScreenshot(imageBuffer);
      if (mightBeWallpaperOnly) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Screenshot May Be Incomplete",
          message: "Screenshot might only show wallpaper. This usually indicates a permissions issue.",
          primaryAction: {
            title: "Fix Permissions",
            onAction: async () => {
              await showPermissionInstructions();
            },
          },
          secondaryAction: {
            title: "Upload Anyway",
            onAction: async () => {},
          },
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Failed",
        message: `Could not read screenshot file: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Uploading",
      message: "Uploading screenshot...",
    });

    const formData = new FormData();
    formData.append("file", imageBuffer, {
      filename: `screenshot-${Date.now()}.png`,
      contentType: "image/png",
    });

    const uploadUrl = `${apiUrl}/upload`;

    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: {
        "x-api-key": apiKey,
        ...formData.getHeaders(),
      },
    });

    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }

    if (!uploadResult.ok) {
      const errorText = await uploadResult.text();

      if (uploadResult.status === 401) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: "Invalid API key. Please check your API key in settings.",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Upload Failed",
          message: `HTTP ${uploadResult.status}: ${errorText}`,
        });
      }
      return;
    }

    const result = await uploadResult.json();

    if (!result.success) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload Failed",
        message: result.message || "Unknown error occurred",
      });
      return;
    }

    const finalUrl = result.file.url.replace("https://api.pain.is/", baseUrl + "/");

    await Clipboard.copy(finalUrl);

    await showHUD(`Screenshot uploaded! URL copied to clipboard: ${finalUrl}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
