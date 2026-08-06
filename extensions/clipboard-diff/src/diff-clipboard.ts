import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile);

// Raycast launches commands with a minimal PATH, so editor CLIs installed in
// these locations are not found by name alone. /bin and /usr/bin matter too:
// the `code` launcher is a `#!/usr/bin/env bash` script, so bash must be findable.
const EXTRA_PATHS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin",
  "/Applications/Cursor.app/Contents/Resources/app/bin",
];

const PATH = [...EXTRA_PATHS, ...(process.env.PATH?.split(":") ?? [])].join(
  ":",
);

function resolveEditor(command: string): string {
  if (command.includes("/")) return command;
  const hit = EXTRA_PATHS.map((dir) => join(dir, command)).find((candidate) =>
    existsSync(candidate),
  );
  return hit ?? command;
}

export default async function main() {
  const { editorCommand, fileExtension } =
    getPreferenceValues<Preferences.DiffClipboard>();
  const editor = (editorCommand || "code").trim();
  const ext = (fileExtension || "txt").trim().replace(/^\./, "");

  try {
    const [latest, previous] = await Promise.all([
      Clipboard.readText({ offset: 0 }),
      Clipboard.readText({ offset: 1 }),
    ]);

    if (!latest || !previous) {
      await showFailureToast(
        new Error(
          "Need at least two text entries in Raycast's clipboard history.",
        ),
        { title: "Not enough clipboard history" },
      );
      return;
    }

    const dir = await mkdtemp(join(tmpdir(), "clipboard-diff-"));
    const previousFile = join(dir, `clipboard-previous.${ext}`);
    const latestFile = join(dir, `clipboard-latest.${ext}`);

    await Promise.all([
      writeFile(previousFile, previous, "utf8"),
      writeFile(latestFile, latest, "utf8"),
    ]);

    // Older entry on the left, newest on the right — reads like a normal diff.
    await exec(resolveEditor(editor), ["--diff", previousFile, latestFile], {
      env: { ...process.env, PATH },
    });

    await showHUD(
      latest === previous
        ? "Opened diff (both entries are identical)"
        : "Opened diff in editor",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      await showFailureToast(
        new Error(
          `Could not run "${editor}". Install its shell command or set the full path in preferences.`,
        ),
        { title: "Editor CLI not found" },
      );
      return;
    }
    await showFailureToast(error, { title: "Could not open diff" });
  }
}
