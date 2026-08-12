import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import { ContentMatch } from "../search/content-match.service";
import { Note, ObsidianVault } from "@/obsidian";
import { normalizeRelativePath } from "@/utils/utils";

const CLI_TIMEOUT_MS = 10_000;
const MACOS_CLI_PATH = "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli";

export class ObsidianCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObsidianCliError";
  }
}

export function getObsidianCliExecutable(): string {
  if (os.platform() === "darwin" && fs.existsSync(MACOS_CLI_PATH)) {
    return MACOS_CLI_PATH;
  }
  return "obsidian";
}

export function buildObsidianCursorScript(match: ContentMatch): string {
  const from = { line: match.line - 1, ch: match.column - 1 };
  const to = { line: match.endLine - 1, ch: match.endColumn - 1 };

  return `(() => {
    const editor = app.workspace.activeLeaf?.view?.editor;
    if (!editor) throw new Error("The active Obsidian view is not an editable Markdown note");
    const from = ${JSON.stringify(from)};
    const to = ${JSON.stringify(to)};
    editor.setSelection(from, to);
    editor.scrollIntoView({ from, to }, true);
    return "ok";
  })()`;
}

function runObsidianCli(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(getObsidianCliExecutable(), args, { timeout: CLI_TIMEOUT_MS }, (error, _stdout, stderr) => {
      if (!error) {
        resolve();
        return;
      }

      const details = stderr?.trim() || error.message;
      reject(new ObsidianCliError(details));
    });
  });
}

export async function openObsidianAtMatch(note: Note, vault: ObsidianVault, match: ContentMatch): Promise<void> {
  const notePath = normalizeRelativePath(note.path, vault.path);
  const vaultArgument = `vault=${vault.name}`;

  await runObsidianCli([vaultArgument, "open", `path=${notePath}`]);
  await runObsidianCli([vaultArgument, "eval", `code=${buildObsidianCursorScript(match)}`]);
}

export function getObsidianCliErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/not enabled|command line interface/i.test(message)) {
    return "Enable Command line interface in Obsidian Settings > General > Advanced.";
  }
  if (/ENOENT|not found|cannot find/i.test(message)) {
    return "Install Obsidian 1.12.7 or later, enable its CLI, then restart Raycast.";
  }
  return message;
}
