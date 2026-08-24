import { Application } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Builds the `/usr/bin/open` argv that opens `dir` in the given terminal app.
 *
 * A plain `open -a <App> <folder>` (what `Action.Open` does) only works for terminals
 * that accept an "open folder" Apple event — Terminal.app and iTerm2. Most other
 * terminals take the working directory as a launch argument instead, which requires a
 * fresh instance (`open -n`), or use a URL scheme (Warp).
 */
function openArgs(app: Application | undefined, dir: string): string[] {
  if (!app) return ["-b", "com.apple.Terminal", dir];
  const target = app.bundleId ? ["-b", app.bundleId] : ["-a", app.path];
  const id = (app.bundleId ?? "").toLowerCase();
  if (id.startsWith("dev.warp.warp")) {
    return [...target, `warp://action/new_window?path=${encodeURIComponent(dir)}`];
  }
  switch (id) {
    case "org.alacritty":
    case "io.alacritty":
      return ["-n", ...target, "--args", "--working-directory", dir];
    case "net.kovidgoyal.kitty":
      return ["-n", ...target, "--args", "--single-instance", "--directory", dir];
    case "com.github.wez.wezterm":
      // Without --always-new-process, `start` delegates to an already-running GUI
      // instance and the --cwd can get lost there (wezterm/wezterm#6218).
      return ["-n", ...target, "--args", "start", "--always-new-process", "--cwd", dir];
    case "com.mitchellh.ghostty":
      return ["-n", ...target, "--args", `--working-directory=${dir}`];
    default:
      return [...target, dir];
  }
}

/**
 * Env for the `open` call, mimicking a Finder launch: `open` forwards the caller's
 * environment to a freshly launched app, and Raycast's runtime carries a BCP-47
 * `LC_ALL` (e.g. `en_DE-u-hc-h23-…`) that is not a valid POSIX locale — shells in
 * the new terminal would warn "setlocale: cannot change locale". Without the
 * variables the terminal derives its own locale, as it does when started normally.
 */
function launchEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "LANG" && !key.startsWith("LC_")));
}

/** Opens `dir` in the configured terminal app, adapting the launch command to the app. */
export async function openInTerminal(app: Application | undefined, dir: string): Promise<void> {
  await execFileAsync("/usr/bin/open", openArgs(app, dir), { env: launchEnv() });
}
