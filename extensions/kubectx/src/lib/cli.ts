import { accessSync, constants } from "fs";
import { cpus } from "os";

export const getBrewExecutablePath = (packageName: string) => {
  const path = cpus()[0].model.includes("Apple") ? `/opt/homebrew/bin/${packageName}` : `/usr/local/bin/${packageName}`;

  try {
    accessSync(path, constants.X_OK);

    return path;
  } catch {
    return packageName;
  }
};
