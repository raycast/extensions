import { PassCliError } from "../types";

export interface Artifact {
  url: string;
  sha256: string;
  kind: "raw" | "zip";
  binaryName: "pass-cli" | "pass-cli.exe";
  requiredFiles: readonly string[];
}

export const PASS_CLI_VERSION = "2.5.1";
const BASE_URL = `https://proton.me/download/pass-cli/${PASS_CLI_VERSION}`;

const ARTIFACTS: Record<string, Artifact> = {
  "darwin-arm64": {
    url: `${BASE_URL}/pass-cli-macos-aarch64`,
    sha256: "2c5834dd21bef341db70c39eaa0a353d4b9e49a8a0d4e5579c02f62ed70db3d9",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  },
  "darwin-x64": {
    url: `${BASE_URL}/pass-cli-macos-x86_64`,
    sha256: "fed0d6a919b8b05921c508cdd4cfe8c05a0b0cf4ccc55ed036e3b51ace6f7373",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  },
  "win32-x64": {
    url: `${BASE_URL}/pass-cli-windows-x86_64.zip`,
    sha256: "d1000e98de533b3e074e9bebf0f7dd562ee228030dc2dbba2bd454d5c0067511",
    kind: "zip",
    binaryName: "pass-cli.exe",
    requiredFiles: ["pass-cli.exe", "libcrypto-3-x64.dll"],
  },
};

export function resolveArtifact(platform: string, arch: string): Artifact {
  const key = `${platform}-${arch}`;
  const artifact = ARTIFACTS[key];
  if (!artifact) {
    throw new PassCliError(
      `Unsupported platform: ${key}. Supported platforms: ${Object.keys(ARTIFACTS).join(", ")}`,
      "unsupported_platform",
    );
  }
  return artifact;
}
