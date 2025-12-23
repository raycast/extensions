import { unlink } from "node:fs/promises";
import { resolveAndValidatePath } from "../utils/workspace";
import { existsSync } from "node:fs";

type Input = {
  /**
   * The relative path to the file from the workspace root
   */
  path: string;
};

export async function confirmation({ path }: Input) {
  const filePath = resolveAndValidatePath(path);

  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${path}`);
  }

  return {
    message: `Are you sure you want to delete this file?`,
    info: [
      { name: "File Path", value: path },
      { name: "Action", value: "Delete File" },
      { name: "Warning", value: "This action cannot be undone" },
    ],
  };
}

export default async function ({ path }: Input) {
  const filePath = resolveAndValidatePath(path);

  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${path}`);
  }

  // Delete the file
  await unlink(filePath);

  return {
    success: true,
    message: `Successfully deleted file: ${path}`,
  };
}
