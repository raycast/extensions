import { showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cliConfigPath, serverHost } from "./argocd";

const execFileAsync = promisify(execFile);

const EXTRA_PATH_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

export default async function Command() {
  const host = serverHost();
  const configPath = cliConfigPath();

  await showToast({
    style: Toast.Style.Animated,
    title: "Logging in to ArgoCD",
    message: `Waiting for SSO login in browser (${host})`,
  });

  try {
    await execFileAsync("argocd", ["login", host, "--sso", "--config", configPath], {
      env: { ...process.env, PATH: [...EXTRA_PATH_DIRS, process.env.PATH].join(":") },
      timeout: 120_000,
    });
    await showHUD(`Logged in to ${host}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await showToast({ style: Toast.Style.Failure, title: "ArgoCD login failed", message });
  }
}
