import { Application, environment } from "@raycast/api";
import fs from "node:fs";
import { MenusConfig } from "../types";

/*
 * Filename for app config
 * Used for storing and retrieving menu bar items config based on app
 */
export function getFileNameForCache(app: Application) {
  return `${app.name.replace(/[^a-zA-Z0-9-_]/g, "_")}__config`;
}

/*
 * Read local cached file with shortcuts info
 */
export async function readFileCache(filename: string): Promise<MenusConfig> {
  try {
    const data = await fs.promises.readFile(
      `${environment.supportPath}/${filename}.json`,
      "utf-8",
    );
    return JSON.parse(data);
  } catch (e) {
    throw new Error(
      `Could not find or parse local config file ${filename}.json`,
    );
  }
}

/*
 * Create cached shortcuts file
 */
export async function writeFileCache(
  filename: string,
  data: MenusConfig,
): Promise<void> {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(
      `${environment.supportPath}/${filename}.json`,
      jsonData,
      "utf-8",
    );
  } catch (e) {
    throw new Error(`Could not create local config file ${filename}.json`);
  }
}
