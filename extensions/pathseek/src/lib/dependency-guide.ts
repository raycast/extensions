/** Simple, user-initiated installation guidance. Never installs or downloads tools. */
export const HOMEBREW_INSTALL_COMMAND = "brew install fd fzf";
export const HOMEBREW_URL = "https://brew.sh/";

export function getMissingBinary(error?: string): "fd" | "fzf" | null {
  const match = /^(?:Error:\s*)?Cannot locate (fd|fzf)\./.exec(error ?? "");
  return (match?.[1] as "fd" | "fzf" | undefined) ?? null;
}

export function missingBinaryMessage(name: "fd" | "fzf"): string {
  return `PathSeek cannot find ${name}. Install fd and fzf with Homebrew: ${HOMEBREW_INSTALL_COMMAND}. If already installed, set the executable paths in PathSeek preferences.`;
}
