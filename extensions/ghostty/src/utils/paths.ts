import os from "node:os";
import path from "node:path";

export function expandHome(inputPath: string) {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export function toTildePath(inputPath: string) {
  const homeDirectory = os.homedir();

  if (inputPath === homeDirectory) {
    return "~";
  }

  if (inputPath.startsWith(`${homeDirectory}${path.sep}`)) {
    return `~/${inputPath
      .slice(homeDirectory.length + 1)
      .split(path.sep)
      .join("/")}`;
  }

  return inputPath;
}

export function getDirectoryName(inputPath: string) {
  const normalizedPath = expandHome(inputPath).replace(/\/+$/, "") || path.sep;
  return path.basename(normalizedPath);
}

export function appleScriptString(value: string) {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n").replaceAll("\r", "\\r");
  return `"${escaped}"`;
}
