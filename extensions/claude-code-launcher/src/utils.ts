import { homedir } from "os";
import path from "path";

export function expandTilde(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(homedir(), filepath.slice(2));
  }
  return filepath;
}

export function collapseTilde(filepath: string): string {
  const home = homedir();
  if (filepath === home) return "~";
  if (filepath.startsWith(home + path.sep)) {
    return "~" + filepath.slice(home.length);
  }
  return filepath;
}

export function getDirectoryName(dirPath: string): string {
  return path.basename(dirPath) || path.dirname(dirPath);
}
