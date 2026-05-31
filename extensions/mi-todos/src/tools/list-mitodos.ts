import fs from "fs";
import path from "path";
import os from "os";

/**
 * Lists all MiToDos files in ~/MiToDos/.
 *
 * Note: Raycast AI tools cannot access user preferences, so this tool
 * uses the default directory. The extension commands (Add Task, Create
 * Project, Search) respect the user-configured mitodosDir preference.
 */
export default async function () {
  const mitodosDir = path.join(os.homedir(), "MiToDos");

  try {
    if (!fs.existsSync(mitodosDir)) {
      return "MiToDos directory not found at ~/MiToDos/ — run Add Task or Create Project first to create it.";
    }

    const files = fs
      .readdirSync(mitodosDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));

    return files.length > 0
      ? files
      : "No MiToDos files found — use mi add or mi project to get started";
  } catch (error) {
    return `Error listing MiToDos files: ${String(error)}`;
  }
}
