import { readIniFile } from "./utils";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import { spawn } from "child_process";

export interface IConfiguration {
  name: string;
}

export const getPathToConfigFile = (): string => {
  return join(homedir(), ".saml2aws");
};

export const getConfigurations = (pathToFile: string = getPathToConfigFile()) => {
  if (!existsSync(pathToFile)) throw new Error(`File ${pathToFile} does not exist`);

  const config = readIniFile(pathToFile);

  return config as Record<string, IConfiguration>;
};

export const login = (
  profileName: string,
  onMfa: (code: string) => void,
  onDone: (done: undefined | { expiresAt: Date }) => void,
  onError: (data: string) => void
) => {
  const command = "saml2aws";
  const args = ["login", `-a ${profileName}`, "--skip-prompt", "--force"];

  const process = spawn(command, args, { shell: true });

  process.stderr.on("data", (dataObject: string) => {
    const data = dataObject.toString();

    if (data.includes("Entropy")) {
      const regex = /(\d+)/u;
      const matches = data.match(regex);

      if (matches) {
        const number = matches[0];
        onMfa(number);
      } else {
        throw new Error("No entropy found");
      }
    }

    if (data.includes("Error")) {
      onError(data);
    }

    if (data.includes("expire at")) {
      onDone({ expiresAt: new Date() });
    }
  });
};
