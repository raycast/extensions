import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import { ContentMatch } from "../search/content-match.service";
import { Note, ObsidianVault } from "@/obsidian";
import { normalizeRelativePath } from "@/utils/utils";

const CLI_TIMEOUT_MS = 10_000;
const MATCH_ACTIVATION_TIMEOUT_MS = 15_000;
const MATCH_RETRY_DELAYS_MS = [100, 200, 400, 800, 1200, 1600, 2000];
const MATCH_STABILIZATION_DELAYS_MS = [300, 700];
const MATCH_APPLIED_RESULT = "raycast-match-applied";
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

export function buildObsidianCursorScript(match: ContentMatch, notePath: string): string {
  const from = { line: match.line - 1, ch: match.column - 1 };
  const to = { line: match.endLine - 1, ch: match.endColumn - 1 };

  return `(() => {
    const targetPath = ${JSON.stringify(notePath)};
    const from = ${JSON.stringify(from)};
    const to = ${JSON.stringify(to)};
    const editor = app.workspace.activeLeaf?.view?.editor;
    if (app.workspace.getActiveFile()?.path !== targetPath || !editor) return "waiting";

    editor.setSelection(from, to);
    editor.scrollIntoView({ from, to }, true);
    return ${JSON.stringify(MATCH_APPLIED_RESULT)};
  })()`;
}

function runObsidianCli(args: string[], timeout = CLI_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(getObsidianCliExecutable(), args, { timeout }, (error, stdout, stderr) => {
      if (!error) {
        resolve(stdout);
        return;
      }

      const details = stderr?.trim() || error.message;
      reject(new ObsidianCliError(details));
    });
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isPermanentCliError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ENOENT|not found|not enabled|command line interface|unknown command|invalid vault/i.test(message);
}

async function applyMatch(
  vaultArgument: string,
  notePath: string,
  match: ContentMatch,
  timeout: number
): Promise<boolean> {
  const output = await runObsidianCli(
    [vaultArgument, "eval", `code=${buildObsidianCursorScript(match, notePath)}`],
    Math.min(CLI_TIMEOUT_MS, timeout)
  );
  return output.includes(MATCH_APPLIED_RESULT);
}

async function waitForMatchActivation(
  vaultArgument: string,
  notePath: string,
  match: ContentMatch,
  deadline: number
): Promise<void> {
  let lastError: unknown;
  let attempt = 0;

  while (Date.now() < deadline) {
    try {
      if (await applyMatch(vaultArgument, notePath, match, Math.max(1, deadline - Date.now()))) {
        // Obsidian can restore its saved cursor more than once while loading a workspace.
        let isStable = true;
        for (const stabilizationDelay of MATCH_STABILIZATION_DELAYS_MS) {
          const remainingTime = deadline - Date.now();
          if (remainingTime <= 0) return;
          await delay(Math.min(stabilizationDelay, remainingTime));

          const cliTime = deadline - Date.now();
          if (cliTime <= 0) return;
          if (!(await applyMatch(vaultArgument, notePath, match, cliTime))) {
            isStable = false;
            break;
          }
        }

        if (isStable) return;
      }
    } catch (error) {
      if (isPermanentCliError(error)) throw error;
      lastError = error;
    }

    const retryDelay = MATCH_RETRY_DELAYS_MS[Math.min(attempt, MATCH_RETRY_DELAYS_MS.length - 1)];
    attempt += 1;
    await delay(Math.min(retryDelay, Math.max(0, deadline - Date.now())));
  }

  if (lastError) throw lastError;
  throw new ObsidianCliError("Timed out waiting for Obsidian to activate the note");
}

export async function openObsidianAtMatch(note: Note, vault: ObsidianVault, match: ContentMatch): Promise<void> {
  const notePath = normalizeRelativePath(note.path, vault.path);
  const vaultArgument = `vault=${vault.name}`;
  const deadline = Date.now() + MATCH_ACTIVATION_TIMEOUT_MS;

  try {
    await runObsidianCli([vaultArgument, "open", `path=${notePath}`], Math.min(CLI_TIMEOUT_MS, deadline - Date.now()));
  } catch (error) {
    // A timed-out open command may still have launched Obsidian successfully.
    if (isPermanentCliError(error)) throw error;
  }

  await waitForMatchActivation(vaultArgument, notePath, match, deadline);
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
