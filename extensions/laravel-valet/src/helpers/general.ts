import fs, { Dirent } from "fs";
import { homedir } from "os";
import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { Config } from "../types/entities";

export const configPath = `${homedir()}/.config/valet/config.json`;
export const valetHomePath = `${homedir()}/.config/valet`;
export const sitesPath = `${homedir()}/.config/valet/Sites`;
export const certsPath = `${homedir()}/.config/valet/Certificates`;
export const brewDir = "/opt/homebrew";

export function isRunning(): boolean {
  const expectedPath = `${valetHomePath}/valet.sock`;
  const fileStats = fs.lstatSync(expectedPath);
  // TODO: Is this enough? Should we add an "unknown" state?
  const theRealPath = fileStats.isSymbolicLink() ? fs.readlinkSync(expectedPath) : expectedPath;
  return fs.existsSync(theRealPath);
}

export function pathExists(path: string): boolean {
  return fs.existsSync(path);
}

export function getConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read config file ${configPath}. Make sure Valet is installed and configured.`);
  }
}

/**
 * Get all certificates from config folder.
 * @see https://laravel.com/docs/master/valet#securing-sites
 *
 * @returns {string[]}
 */
export function getCertificates(): string[] {
  try {
    const config = getConfig();
    const certs = fs.readdirSync(certsPath, { withFileTypes: true });

    return certs
      .filter((cert: Dirent) => cert.name.endsWith(".crt"))
      .map((cert: Dirent) => {
        const certWithoutSuffix = cert.name.slice(0, -4);
        let trimToString = ".";

        // If we have the cert ending in our tld, strip that tld specifically
        // if not, then just strip the last segment for backwards compatibility.
        if (certWithoutSuffix.endsWith(config.tld)) {
          trimToString += config.tld;
        }

        return certWithoutSuffix.slice(0, certWithoutSuffix.lastIndexOf(trimToString));
      });
  } catch (error) {
    throw new Error(`Could not read certs path ${certsPath}. Make sure Valet is installed and configured.`);
  }
}

export async function executeCommand(command: string): Promise<Buffer> {
  try {
    const homeDir = execSync("echo $HOME").toString().trim();

    return await execSync(command, {
      env: {
        HOME: homeDir,
        PATH: `/bin:/usr/bin:/usr/local/bin:${brewDir}/bin:${homeDir}/.composer/vendor/bin`,
      },
    });
  } catch (error) {
    throw new Error(`Could not execute command ${command}.`);
  }
}

interface HandleErrorArgs {
  error: Error | unknown;
  title: string;
  primaryAction?: Toast.ActionOptions;
}

export function handleError({ error, title, primaryAction }: HandleErrorArgs) {
  return showToast({
    style: Toast.Style.Failure,
    title: title,
    message: error instanceof Error ? error.message : "",
    primaryAction,
  });
}
