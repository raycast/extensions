import { PassCliError } from "../types";

export interface Artifact {
  url: string;
  sha256: string;
  kind: "raw" | "zip";
  binaryName: "pass-cli" | "pass-cli.exe";
  requiredFiles: readonly string[];
}

export const PASS_CLI_VERSION = "2.7.1";
const BASE_URL = `https://proton.me/download/pass-cli/${PASS_CLI_VERSION}`;

const ARTIFACTS: Record<string, Artifact> = {
  "darwin-arm64": {
    url: `${BASE_URL}/pass-cli-macos-aarch64`,
    sha256: "0f5f749372c77f279f92463c56c3dda777fc3157e5f90ef49ade17bca7e46ba3",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  },
  "darwin-x64": {
    url: `${BASE_URL}/pass-cli-macos-x86_64`,
    sha256: "ea3a6a133292230008e577ebcdf1a0a604177fd9107fdee287c8ed84ef164cd9",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  },
  "win32-x64": {
    url: `${BASE_URL}/pass-cli-windows-x86_64.zip`,
    sha256: "d803bea784ee55abe6091fd4e493d8c3cfefaef48748b03760be73401fa3838a",
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
