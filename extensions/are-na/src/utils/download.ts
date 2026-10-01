import { execFile } from "node:child_process";
import { open, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { isHttpUrl } from "./url";

export function getDownloadFilename(url: string): string {
  const encodedName = new URL(url).pathname.split("/").pop() || "download";
  let name: string;
  try {
    name = decodeURIComponent(encodedName);
  } catch {
    name = encodedName;
  }
  name = name
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\p{Cc}/gu, "_")
    .replace(/[ .]+$/g, "");
  if (!name) name = "download";
  if (/^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name)) name = `_${name}`;

  // Leave room for a duplicate suffix within common filesystem filename limits.
  let boundedName = "";
  for (const character of name) {
    if (Buffer.byteLength(boundedName + character, "utf8") > 180) break;
    boundedName += character;
  }
  return boundedName.replace(/[ .]+$/g, "") || "download";
}

async function getWindowsDownloadsDirectory(): Promise<string> {
  // Shell resolves redirected/localized Downloads folders. No user input enters the script.
  const script =
    "$ErrorActionPreference = 'Stop'; " +
    "$folder = (New-Object -ComObject Shell.Application).NameSpace('shell:Downloads'); " +
    "if ($null -eq $folder) { throw 'Downloads folder unavailable' }; " +
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " +
    "[Console]::Write($folder.Self.Path)";
  const executable = process.env.SystemRoot
    ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { encoding: "utf8", timeout: 10_000, windowsHide: true },
      (error, stdout) => (error ? reject(error) : resolve(stdout.trim())),
    );
  });
}

export async function getDownloadsDirectory(): Promise<string> {
  const configured = getPreferenceValues<Preferences>().downloadDirectory;
  let directory = configured;
  if (!directory) {
    try {
      if (process.platform === "win32") directory = await getWindowsDownloadsDirectory();
      else if (process.platform === "darwin")
        directory = (await runAppleScript("POSIX path of (path to downloads folder)")).trim();
      else throw new Error("Unsupported platform");
    } catch {
      throw new Error("Could not locate your Downloads folder. Choose a Download Directory in extension preferences.");
    }
  }
  if (directory && path.isAbsolute(directory)) {
    try {
      if ((await stat(directory)).isDirectory()) return directory;
    } catch {
      // Missing/inaccessible folders can be replaced with a directory preference.
    }
  }
  throw new Error("Choose an existing, accessible Download Directory in extension preferences.");
}

export async function saveDownload(url: string): Promise<string> {
  if (!isHttpUrl(url)) throw new Error("The download URL must use HTTP or HTTPS.");
  const parsed = new URL(url);
  if (parsed.username || parsed.password) throw new Error("Download URLs cannot contain login credentials.");
  const directory = await getDownloadsDirectory();
  const response = await fetch(url, { signal: AbortSignal.timeout(5 * 60_000) });
  // Raycast fetch versions can expose a Node stream or a Web stream.
  const body = response.body as Readable | ReadableStream | null;
  const source = body ? ("getReader" in body ? Readable.fromWeb(body) : body) : null;
  source?.on("error", () => {
    // Handle failures during asynchronous file creation; pipeline still surfaces the stream's error.
  });
  try {
    if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
    if (!source) throw new Error("The download response has no body.");

    const filename = getDownloadFilename(url);
    const { name, ext } = path.parse(filename);
    for (let duplicate = 0; duplicate < 100; duplicate++) {
      const destination = path.join(directory, duplicate ? `${name} (${duplicate})${ext}` : filename);
      let file;
      try {
        file = await open(destination, "wx", 0o600);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
      let completed = false;
      try {
        await pipeline(source, file.createWriteStream());
        completed = true;
        return destination;
      } finally {
        await file.close();
        if (!completed) await rm(destination, { force: true });
      }
    }
    throw new Error("Too many files have this name. Choose a different Download Directory or remove old copies.");
  } finally {
    source?.destroy();
  }
}

export async function downloadFile(url: string): Promise<string | null> {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Downloading file" });
    const destination = await saveDownload(url);
    await showToast({ style: Toast.Style.Success, title: "Download completed", message: destination });
    return destination;
  } catch (error) {
    await showFailureToast(error, { title: "Download failed" });
    return null;
  }
}
