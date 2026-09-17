import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Editors whose diff is opened through a `--diff` CLI bundled inside the app.
export type Editor = "code" | "cursor" | "codium"; // VS Code, Cursor, or VSCodium

// Maps each editor preference to its macOS application name (the CLI binary inside the bundle is
// named the same as the preference value, e.g. `code`, `cursor`, `codium`).
const EDITOR_APP_NAMES: Record<Editor, string> = {
  code: "Visual Studio Code",
  cursor: "Cursor",
  codium: "VSCodium",
};

// Read the user's preferred editor from the extension preferences.
export function getEditorPreference(): Editor {
  return getPreferenceValues<Preferences>().editor;
}

// Resolve the absolute path to the editor's CLI inside the app bundle. This works even when the
// user never ran "Install 'code' command in PATH" and did not install via Homebrew, since the CLI
// always ships inside the .app. Falls back to the bare command name (resolved via PATH) when the
// app lives in a non-standard location.
function resolveEditorCli(editor: Editor): string {
  const appName = EDITOR_APP_NAMES[editor];
  const relativeBin = `Contents/Resources/app/bin/${editor}`;
  const candidates = [
    `/Applications/${appName}.app/${relativeBin}`,
    `${homedir()}/Applications/${appName}.app/${relativeBin}`,
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? editor;
}

// Open a diff of two files in the configured editor via its `--diff` CLI. Awaiting the launch (via
// execFile, which avoids the shell) keeps no-view commands alive until the editor has started, so
// Raycast does not tear down the process first.
export async function openDiffInEditor(editor: Editor, leftFilePath: string, rightFilePath: string): Promise<void> {
  // Prefer the CLI bundled inside the .app (always present); fall back to the bare command name.
  const cli = resolveEditorCli(editor);

  // Raycast v2 launches as a GUI app, so its process PATH is minimal (/usr/bin:/bin:/usr/sbin:/sbin)
  // and does not include the locations where the `code`/`cursor` CLIs live. Augment PATH so the
  // bare-command fallback can still be found when the app is in a non-standard location.
  const env = {
    ...process.env,
    PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH ?? ""}`,
  };

  await execFileAsync(cli, ["--diff", leftFilePath, rightFilePath], { env });
}
