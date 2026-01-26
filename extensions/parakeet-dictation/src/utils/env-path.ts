/**
 * Environment PATH utilities for Raycast extensions
 *
 * Raycast doesn't inherit the full shell PATH, so we need to manually add
 * common binary locations where Homebrew and pipx install tools.
 */

/**
 * Get enhanced PATH that includes Homebrew and user local bin directories
 */
export function getEnhancedPath(): string {
  const originalPath = process.env.PATH || "";
  const homeDir = process.env.HOME || "";

  // Common locations where tools are installed:
  // - /opt/homebrew/bin (Homebrew on Apple Silicon)
  // - /usr/local/bin (Homebrew on Intel Macs)
  // - ~/.local/bin (pipx and user-installed tools)
  // - Standard system paths (in case Raycast PATH is very minimal)
  const additionalPaths = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    `${homeDir}/.local/bin`,
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];

  // Filter out paths that are already in PATH to avoid duplicates
  const pathArray = originalPath.split(":");
  const newPaths = additionalPaths.filter((p) => !pathArray.includes(p));

  // Add new paths at the beginning so they take priority
  // Filter out empty strings to avoid issues when originalPath is empty
  return [...newPaths, originalPath].filter((p) => p.length > 0).join(":");
}

/**
 * Get enhanced environment with corrected PATH
 */
export function getEnhancedEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: getEnhancedPath(),
  };
}
