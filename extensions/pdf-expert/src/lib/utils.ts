import { homedir } from "os";

const HOME = homedir();

export function shortenPath(fullPath: string): string {
  if (fullPath === HOME) {
    return "~";
  }
  const prefix = HOME + "/";
  if (fullPath.startsWith(prefix)) {
    return "~/" + fullPath.slice(prefix.length);
  }
  return fullPath;
}
