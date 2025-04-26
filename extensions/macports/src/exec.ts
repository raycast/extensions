import { exec, execSync } from "node:child_process";
import type { PortDetails } from "./types";
import { extractPortDetails } from "./util";

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

export async function getPortDetails(name: string): Promise<PortDetails> {
  return new Promise((resolve, reject) => {
    exec(`port info ${name}`, { env }, (error, stdout) => {
      if (error) {
        console.log("error:", error);
        reject(error);
        return;
      }

      const info = stdout.toString();
      const details = extractPortDetails(name, info);

      resolve(details);
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
