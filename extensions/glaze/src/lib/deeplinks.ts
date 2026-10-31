import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import {
  URL_SCHEME,
  GLAZE_APP_PATH,
  IS_GLAZE_INSTALLED,
  TARGET_APP,
} from "./paths";
import { EditorApp, EDITOR_APPS } from "./types";
import * as os from "node:os";
import * as path from "node:path";
import { editProjectUrl } from "./edit-project-url";

const execute = promisify(execFile);
export async function openGlazeUrl(url: string): Promise<void> {
  if (!IS_GLAZE_INSTALLED)
    throw new Error(
      `Install ${TARGET_APP.name} or change Target App in the extension settings.`,
    );
  // Pass arguments directly: prompts and paths must never be interpreted by a shell.
  await execute("/usr/bin/open", ["-a", GLAZE_APP_PATH, url]);
}
export async function openGlazeApp(): Promise<void> {
  await execute("/usr/bin/open", ["-a", GLAZE_APP_PATH]);
}
export async function launchApp(bundlePath: string): Promise<void> {
  await execute("/usr/bin/open", [bundlePath]);
}
export async function editWithAgent(
  projectPath: string,
  appId?: string,
  prompt?: string,
): Promise<void> {
  await openGlazeUrl(editProjectUrl(URL_SCHEME, projectPath, appId, prompt));
}
export async function openStorePage(storeAppId: string): Promise<void> {
  await openGlazeUrl(`${URL_SCHEME}://store/${encodeURIComponent(storeAppId)}`);
}
export async function openProfile(username: string): Promise<void> {
  await openGlazeUrl(`${URL_SCHEME}://profile/${encodeURIComponent(username)}`);
}
export async function openInEditor(
  projectPath: string,
  editor: EditorApp,
): Promise<void> {
  await execute("/usr/bin/open", [
    "-a",
    EDITOR_APPS[editor].appName,
    projectPath,
  ]);
}
export async function revealInFinder(filePath: string): Promise<void> {
  await execute("/usr/bin/open", ["-R", filePath]);
}
export function getAvailableEditors(): EditorApp[] {
  return (Object.keys(EDITOR_APPS) as EditorApp[]).filter((key) =>
    ["/Applications", path.join(os.homedir(), "Applications")].some((root) =>
      fs.existsSync(path.join(root, `${EDITOR_APPS[key].appName}.app`)),
    ),
  );
}
