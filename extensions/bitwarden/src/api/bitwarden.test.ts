import { mkdtemp, rm, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { cliInfo } from "~/api/bitwarden";
import { download } from "~/utils/network";

jest.mock("execa", () => ({
  execa: jest.fn(),
  ExecaChildProcess: Object,
  ExecaError: class extends Error {},
  ExecaReturnValue: Object,
}));

jest.mock("~/utils/platform", () => ({
  get platform() {
    return process.platform === "darwin" ? "macos" : "windows";
  },
}));

const DOWNLOAD_TIMEOUT_MS = 120_000;

const platformArchCases: Array<{ platform: NodeJS.Platform; arch: NodeJS.Architecture; label: string }> = [
  { platform: "win32", arch: "x64", label: "windows/x64" },
  { platform: "darwin", arch: "x64", label: "macos/x64" },
  { platform: "darwin", arch: "arm64", label: "macos/arm64" },
];

describe("Bitwarden CLI binary download and hash verification", () => {
  const originalPlatform = process.platform;
  const originalArch = process.arch;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    Object.defineProperty(process, "arch", { value: originalArch, configurable: true });
  });

  it.each(platformArchCases)(
    "downloads $label binary and verifies SHA256",
    async ({ platform: testPlatform, arch: testArch }) => {
      Object.defineProperty(process, "platform", { value: testPlatform, configurable: true });
      Object.defineProperty(process, "arch", { value: testArch, configurable: true });

      const downloadUrl = cliInfo.downloadUrl;
      const sha256 = cliInfo.sha256;

      const tmpDir = await mkdtemp(join(tmpdir(), "bw-cli-test-"));
      const zipPath = join(tmpDir, `bw-${testPlatform}-${testArch}.zip`);

      try {
        await download(downloadUrl, zipPath, { sha256 });
      } finally {
        await unlink(zipPath).catch(() => {});
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    },
    DOWNLOAD_TIMEOUT_MS
  );
});
