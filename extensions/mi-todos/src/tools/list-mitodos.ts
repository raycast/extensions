import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export default async function () {
  const mitodosDir = path.join(os.homedir(), "MiToDos");

  try {
    if (!fs.existsSync(mitodosDir)) {
      return "MiToDos directory not found at ~/MiToDos/ — run Add Task or Create Project first to create it.";
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
