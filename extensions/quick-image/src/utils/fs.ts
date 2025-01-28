import fs from "node:fs/promises";

/**
 * Check path exists
 */
async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export default {
  ...fs,
  pathExists,
};
