import { exec, execSync } from "node:child_process";
import type { PortDetails, Maintainer } from "./types";
import { extractInstalledPorts, extractPortDetails, sanitizePortName } from "./util";
import { showFailureToast } from "@raycast/utils";

const env = Object.assign({}, process.env, {
  PATH: "/opt/local/bin:/usr/local/bin:/usr/bin:/opt/homebrew/bin",
});

type GithubUser = {
  avatar_url: string;
  login: string;
};

async function fetchGithubAvatars(maintainers: Maintainer[]): Promise<Record<string, string>> {
  const avatars: Record<string, string> = {};

  for (const maintainer of maintainers) {
    if (maintainer.github) {
      try {
        const response = await fetch(`https://api.github.com/users/${maintainer.github}`);
        if (response.ok) {
          const data = (await response.json()) as GithubUser;
          avatars[maintainer.github] = data.avatar_url;
        }
      } catch (error) {
        console.error(`Failed to fetch avatar for ${maintainer.github}:`, error);
      }
    }
  }

  return avatars;
}

export function installPort(name: string) {
  try {
    const safeName = sanitizePortName(name);
    return execSync(`sudo port install ${safeName}`, { env });
  } catch (error) {
    showFailureToast(error, { title: "Failed to install port" });
    throw error;
  }
}

export function uninstallPort(name: string) {
  try {
    const safeName = sanitizePortName(name);
    return execSync(`sudo port uninstall ${safeName}`, { env });
  } catch (error) {
    showFailureToast(error, { title: "Failed to uninstall port" });
    throw error;
  }
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
        resolve(extractInstalledPorts(stdout.toString()));
      });
    });
  } catch (error) {
    console.error("Error listing installed ports:", error);
    return [];
  }
}

export async function isPortInstalled(name: string): Promise<boolean> {
  const installedPorts = await listInstalledPorts();
  return installedPorts.includes(name);
}

export async function getPortDetails(name: string): Promise<PortDetails> {
  return new Promise((resolve, reject) => {
    exec(`port info ${name}`, { env }, async (error, stdout) => {
      if (error) {
        console.error("error:", error);
        reject(error);
        return;
      }

      const info = stdout.toString();
      const details = extractPortDetails(name, info);

      const maintainerAvatars = await fetchGithubAvatars(details.maintainers);

      const enhancedMaintainers = details.maintainers.map((maintainer) => ({
        ...maintainer,
        avatarUrl: maintainer.github ? maintainerAvatars[maintainer.github] : undefined,
      }));

      resolve({
        ...details,
        maintainers: enhancedMaintainers,
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
