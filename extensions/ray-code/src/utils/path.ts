import { homedir } from "node:os";
import { resolve } from "node:path";

export const expandHomePath = (inputPath: string) => {
  if (inputPath === "~") {
    return homedir();
  }

  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return resolve(homedir(), inputPath.slice(2));
  }

  return inputPath;
};
