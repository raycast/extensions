import { trash } from "@raycast/api";
import { resolveAndValidatePath, isAutoEditEnabled } from "../utils/workspace";
import { existsSync } from "node:fs";

type Input = {
  /**
   * The relative path to the file from the workspace root
   */
  path: string;
};

export async function confirmation({ path }: Input) {
  if (isAutoEditEnabled()) {
    return undefined;
  }

  const filePath = resolveAndValidatePath(path);

  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${path}`);
  }

  return {
    message: `Are you sure you want to move this file to trash?`,
    info: [
      { name: "File Path", value: path },
      { name: "Action", value: "Move to Trash" },
    ],
  };
}

export default async function ({ path }: Input) {
  const filePath = resolveAndValidatePath(path);

  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File does not exist: ${path}`);
  }

  // Delete the file (moves to trash for safer deletion)
  await trash(filePath);

  return {
    success: true,
    message: `Successfully deleted file: ${path}`,
  };
}
