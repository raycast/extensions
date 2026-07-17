import {
  getPreferenceValues,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";

function localDateAndTime(date = new Date()): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function expandHome(folder: string): string {
  return folder.replace(/^~(?=$|\/)/, process.env.HOME ?? "~");
}

function appendRemotely(
  target: string,
  folder: string,
  filename: string,
  entry: string,
  remoteShell: "posix" | "powershell",
): Promise<void> {
  const payload = JSON.stringify({ folder, filename, entry });
  const encoded = Buffer.from(payload, "utf8").toString("base64");
  const script =
    remoteShell === "powershell"
      ? `
$payload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')) | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $payload.folder | Out-Null
$file = Join-Path $payload.folder $payload.filename
[IO.File]::AppendAllText($file, $payload.entry, [Text.UTF8Encoding]::new($false))
`
      : `
decode() { if base64 --help 2>/dev/null | grep -q -- '-d'; then printf '%s' "$1" | base64 -d; else printf '%s' "$1" | base64 -D; fi; }
folder=$(decode '${Buffer.from(folder, "utf8").toString("base64")}')
filename=$(decode '${Buffer.from(filename, "utf8").toString("base64")}')
entry=$(decode '${Buffer.from(entry, "utf8").toString("base64")}')
mkdir -p -- "$folder"
printf '%s' "$entry" >> "$folder/$filename"
`;

  return new Promise((resolve, reject) => {
    const child = spawn(
      "ssh",
      remoteShell === "powershell"
        ? [
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
            "-o",
            "ServerAliveInterval=5",
            "-o",
            "ServerAliveCountMax=2",
            target,
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "-",
          ]
        : [
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
            "-o",
            "ServerAliveInterval=5",
            "-o",
            "ServerAliveCountMax=2",
            target,
            "sh",
            "-s",
          ],
      {
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
    let errorOutput = "";
    child.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });
    child.on("error", reject);
    child.stdin.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(errorOutput.trim() || `ssh exited with code ${code}`));
    });
    child.stdin.end(script);
  });
}

export default async function QuickNote(
  props: LaunchProps<{ arguments: Arguments.Quicknote }>,
) {
  const note = props.arguments.note.trim();
  if (!note) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to save",
      message: "Enter a note first",
    });
    return;
  }

  const {
    storageMode,
    fileMode,
    remoteShell,
    staticFilename,
    localFolder,
    sshTarget,
    remoteFolder,
  } = getPreferenceValues<Preferences.Quicknote>();
  const { date, time } = localDateAndTime();
  let filename = fileMode === "static" ? staticFilename?.trim() : `${date}.md`;
  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    /[\\\\/]/.test(filename)
  ) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid filename",
      message: "Use a filename such as inbox.md",
    });
    return;
  }
  if (fileMode === "static" && !filename.toLowerCase().endsWith(".md")) {
    filename += ".md";
  }
  const entry = `${time}: ${note}\n`;

  try {
    if (storageMode === "ssh") {
      if (!sshTarget?.trim() || !remoteFolder?.trim()) {
        throw new Error(
          "Set SSH Target and Remote Notes Folder in preferences",
        );
      }
      await appendRemotely(
        sshTarget.trim(),
        remoteFolder.trim(),
        filename,
        entry,
        remoteShell,
      );
    } else {
      if (!localFolder?.trim())
        throw new Error("Set Local Notes Folder in preferences");
      const folder = expandHome(localFolder.trim());
      await mkdir(folder, { recursive: true });
      await appendFile(path.join(folder, filename), entry, "utf8");
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Saved",
      message: filename,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write the note";
    await showToast({
      style: Toast.Style.Failure,
      title: "Save failed",
      message,
    });
  }
}
