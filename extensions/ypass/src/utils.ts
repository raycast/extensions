import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  binaryPath: string;
}

// Comprehensive PATH for macOS - covers Homebrew on both Intel and Apple Silicon
export const MACOS_PATH = [
  "/opt/homebrew/bin", // Apple Silicon Homebrew
  "/usr/local/bin", // Intel Homebrew
  "/opt/homebrew/sbin",
  "/usr/local/sbin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  process.env.PATH,
]
  .filter(Boolean)
  .join(":");

export function getPasswordGeneratorPath(): string {
  const { binaryPath } = getPreferenceValues<Preferences>();
  return binaryPath || "ypass";
}
