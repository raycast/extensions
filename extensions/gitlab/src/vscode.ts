import { fileExistsSync } from "./utils";

export function getVSCodeAppPath(): string | undefined {
  const filepath = "/Applications/Visual Studio Code.app";
  if (fileExistsSync(filepath)) {
    return filepath;
  } else {
    return undefined;
  }
}
