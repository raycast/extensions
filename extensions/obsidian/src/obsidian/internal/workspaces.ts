import { Logger } from "@/api/logger/logger.service";
import fs from "fs";

const logger = new Logger("Workspaces");

export interface Workspace {
  main: unknown;
  left: unknown;
  right: unknown;
  "left-ribbon": unknown;
  active: string;
  mtime: string;
}

export interface WorkspacesJson {
  workspaces: Record<string, Workspace>;
  active: string;
}

export function getWorkspacesJson(vaultPath: string, configFileName: string): WorkspacesJson | undefined {
  const bookmarksJsonPath = `${vaultPath}/${configFileName || ".obsidian"}/workspaces.json`;
  if (!fs.existsSync(bookmarksJsonPath)) {
    logger.warning("No workspaces JSON found");
    return;
  }
  const fileContent = fs.readFileSync(bookmarksJsonPath, "utf-8");
  const bookmarkJson = JSON.parse(fileContent) as WorkspacesJson;
  logger.info(bookmarkJson);
  return bookmarkJson;
}

export function getWorkspaces(vaultPath: string, configFileName: string) {
  const workspacesJson = getWorkspacesJson(vaultPath, configFileName);
  if (!workspacesJson) return;

  return workspacesJson;
}
