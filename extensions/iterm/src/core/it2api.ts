import { execSync, exec } from "child_process";
import { existsSync } from "fs";
import { showToast, Toast } from "@raycast/api";

export const IT2API_PATH = "/Applications/iTerm.app/Contents/Resources/utilities/it2api";

export const isIt2apiAvailable = () => existsSync(IT2API_PATH);

export type It2apiReadyResult = { ready: true } | { ready: false; reason: string };

export const extendedPath = [
  `${process.env.HOME}/.local/share/mise/shims`,
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  process.env.PATH ?? "",
]
  .filter(Boolean)
  .join(":");

export const checkIt2apiReady = (): It2apiReadyResult => {
  if (!existsSync(IT2API_PATH))
    return { ready: false, reason: "it2api not found — ensure iTerm2 is installed at /Applications/iTerm.app" };
  try {
    execSync(`python3 -c "import iterm2"`, { stdio: "pipe", env: { ...process.env, PATH: extendedPath } });
  } catch {
    return { ready: false, reason: "iterm2 Python package missing — run: python3 -m pip install iterm2" };
  }
  return { ready: true };
};

export const checkIt2apiReadyAsync = async (): Promise<It2apiReadyResult> => {
  if (!existsSync(IT2API_PATH))
    return { ready: false, reason: "it2api not found — ensure iTerm2 is installed at /Applications/iTerm.app" };

  return new Promise((resolve) => {
    exec(`python3 -c "import iterm2"`, { env: { ...process.env, PATH: extendedPath } }, (err) => {
      if (err) resolve({ ready: false, reason: "iterm2 Python package missing — run: python3 -m pip install iterm2" });
      else resolve({ ready: true });
    });
  });
};

export const warnIt2apiMissing = () =>
  showToast({
    style: Toast.Style.Failure,
    title: "it2api not found",
    message: `Expected at ${IT2API_PATH} — ensure iTerm2 is installed at /Applications/iTerm.app`,
  });
