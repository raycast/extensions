import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import { expandHome, resolvePath } from "../util/storage";

export default async function () {
  const prefs = getPreferenceValues<Preferences>();
  const mitodosDir = resolvePath(expandHome(prefs.mitodosDir));

  try {
    if (!fs.existsSync(mitodosDir)) {
      return `MiToDos directory not found at ${mitodosDir} — run Add Task or Create Project first to create it.`;
    }

    const files = fs
      .readdirSync(mitodosDir)
      .filter((f: string) => f.endsWith(".md"))
      .map((f: string) => f.replace(".md", ""));

    return files.length > 0
      ? files
      : "No MiToDos files found — use mi add or mi project to get started";
  } catch (error) {
    return `Error listing MiToDos files: ${String(error)}`;
  }
}
