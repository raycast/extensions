import os from "os";

/**
 * Expand ~ & $HOME of a path on unixes.
 */
export const expandPath = (filePath: string): string => {
  if (typeof filePath !== "string") {
    throw new TypeError(`Expected a string, got ${typeof filePath}`);
  }

  return filePath.replace(/^(~|\$HOME)/, os.homedir());
};
