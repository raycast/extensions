import fs from "fs";
import path from "path";
import os from "os";

/**
 * Lists all available context files.
 * Returns the names of the contexts without the .txt extension.
 */
export default async function () {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");

  try {
    if (!fs.existsSync(contextsDir)) {
      return "No contexts directory found";
    }
    const files = fs
      .readdirSync(contextsDir)
      .filter((file) => file.endsWith(".txt"))
      .map((file) => file.replace(".txt", ""));

    return files.length > 0 ? files : "No contexts available";
  } catch (error) {
    return `Error listing contexts: ${String(error)}`;
  }
}
