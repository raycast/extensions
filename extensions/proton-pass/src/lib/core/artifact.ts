import { PassCliError } from "../types";

export interface Artifact {
  url: string;
  sha256: string;
  kind: "raw" | "zip";
  binaryName: "pass-cli" | "pass-cli.exe";
  requiredFiles: readonly string[];
}

export const PASS_CLI_VERSION = "2.3.3";
const BASE_URL = `https://proton.me/download/pass-cli/${PASS_CLI_VERSION}`;

const ARTIFACTS: Record<string, Artifact> = {
  "darwin-arm64": {
    url: `${BASE_URL}/pass-cli-macos-aarch64`,
    sha256: "3281587ac9c50ae2f1604ba75e9d1d39b6debb221b65a6cc56f64d626ede3dbc",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  },
  "darwin-x64": {
    url: `${BASE_URL}/pass-cli-macos-x86_64`,
    sha256: "275f6159f63d152ecdd9d4e2969ef515291619005e0d30ab762daee26081621c",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  },
  "win32-x64": {
    url: `${BASE_URL}/pass-cli-windows-x86_64.zip`,
    sha256: "4169c7644e3475f294d265e2f1262476573e41d372b905187222c52f1c6dbca5",
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
