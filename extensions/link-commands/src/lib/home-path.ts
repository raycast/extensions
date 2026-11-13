import { homedir } from "node:os";
import { join } from "node:path";

export const expandHome = (path: string) => (path.startsWith("~") ? join(homedir(), path.slice(1)) : path);

/**
 * Paths are shown with the home directory collapsed back to `~`. Beyond being shorter, an absolute path
 * rendered in full puts the account name on screen, which then travels into any screenshot or screen share
 * of the extension.
 */
export const collapseHome = (path: string) => {
  const home = homedir();

  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
};
