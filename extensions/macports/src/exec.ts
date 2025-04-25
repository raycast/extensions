import { exec, execSync } from "node:child_process";

const env = Object.assign({}, process.env, {
  PATH: "/opt/local/bin:/usr/local/bin:/usr/bin:/opt/homebrew/bin",
});

export function installPort(name: string) {
  return execSync(`sudo port install ${name}`, { env });
}

export function uninstallPort(name: string) {
  return execSync(`sudo port uninstall ${name}`, { env });
}

export async function listInstalledPorts(): Promise<string[]> {
  try {
    return new Promise((resolve) => {
      exec("port installed", { env }, (error, stdout) => {
        if (error) {
          console.error("Error listing installed ports:", error);
          resolve([]);
          return;
        }
        resolve(
          stdout
            .toString()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line)
            .map((line) => line.split(" ")[0]),
        );
      });
    });
  } catch (error) {
    console.error("Error listing installed ports:", error);
    return [];
  }
}

type Maintainer = {
  email?: string;
  github?: string;
};

type PortDetails = {
  name: string;
  description: string;
  homepage: string;
  maintainers: Maintainer[];
  variants: string[];
  dependencies: string[];
};

export async function getPortDetails(name: string): Promise<PortDetails> {
  return new Promise((resolve, reject) => {
    exec(`port info ${name}`, { env }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const info = stdout.toString();

      function extractValue(key: string): string {
        const regex = new RegExp(`^${key}:\\s*([\\s\\S]*?)(?=^[A-Z][a-zA-Z\\s]+:|$)`, "im");
        const match = info.match(regex);
        return match ? match[1].trim() : "";
      }

      function parseList(value: string): string[] {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      function parseMaintainers(): Maintainer[] {
        const pairs = info.matchAll(/Email:\s*([^,\s]+),\s*GitHub:\s*([^,\s]+)/g);
        return Array.from(pairs).map((match) => ({
          email: match[1],
          github: match[2],
        }));
      }

      resolve({
        name,
        description: extractValue("Description"),
        homepage: extractValue("Homepage"),
        maintainers: parseMaintainers(),
        variants: parseList(extractValue("Variants")),
        dependencies: extractValue("Library Dependencies") ? parseList(extractValue("Library Dependencies")) : [],
      });
    });
  });
}

export async function isMacPortsInstalled(): Promise<boolean> {
  try {
    return new Promise((resolve) => {
      exec("which port", { env }, (error) => {
        resolve(!error);
      });
    });
  } catch {
    return false;
  }
}
