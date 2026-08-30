import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { installArtifact } from "./installer";
import { Artifact } from "./artifact";
import { makeZip } from "./zip-test-helper";

async function withPaths(run: (destDir: string, tempDir: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "proton-pass-install-"));
  try {
    await run(path.join(root, "cli"), path.join(root, "download"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const rawArtifact: Artifact = {
  url: "https://example.test/pass-cli",
  sha256: "069e5fd5c6387236bbfd4060ea0bc7363812208733785c02dd9c089b233fe34a",
  kind: "raw",
  binaryName: "pass-cli",
  requiredFiles: ["pass-cli"],
};

function zipArtifact(archive: Buffer): Artifact {
  return {
    url: "https://example.test/pass-cli.zip",
    sha256: createHash("sha256").update(archive).digest("hex"),
    kind: "zip",
    binaryName: "pass-cli.exe",
    requiredFiles: ["pass-cli.exe", "libcrypto-3-x64.dll"],
  };
}

test("installs a verified macOS binary and makes it executable", async () => {
  await withPaths(async (destDir, tempDir) => {
    const binary = Buffer.from("fake macOS binary!!!");
    const installed = await installArtifact({
      artifact: rawArtifact,
      download: async () => binary,
      destDir,
      tmpDir: tempDir,
      platform: "darwin",
    });

    assert.equal(installed, path.join(destDir, "pass-cli"));
    assert.deepEqual(await readFile(installed), binary);
    if (process.platform !== "win32") assert.notEqual((await stat(installed)).mode & 0o111, 0);
    await assert.rejects(access(tempDir));
  });
});

test("rejects raw and ZIP checksum mismatches without leaving partial files", async () => {
  for (const artifact of [rawArtifact, { ...zipArtifact(Buffer.from("not a zip")), sha256: "0".repeat(64) }]) {
    await withPaths(async (destDir, tempDir) => {
      await assert.rejects(
        installArtifact({
          artifact: { ...artifact, sha256: `${artifact.sha256.slice(0, -1)}0` },
          download: async () => Buffer.from("tampered download"),
          destDir,
          tmpDir: tempDir,
          platform: artifact.kind === "raw" ? "darwin" : "win32",
        }),
        /SHA256/,
      );
      await assert.rejects(access(path.join(destDir, artifact.binaryName)));
      await assert.rejects(access(tempDir));
    });
  }
});

test("cleans partial paths when download fails", async () => {
  await withPaths(async (destDir, tempDir) => {
    await assert.rejects(
      installArtifact({
        artifact: rawArtifact,
        download: async () => {
          throw new Error("download unavailable");
        },
        destDir,
        tmpDir: tempDir,
        platform: "darwin",
      }),
      /download unavailable/,
    );
    await assert.rejects(access(path.join(destDir, "pass-cli")));
    await assert.rejects(access(tempDir));
  });
});

test("a concurrent failed install does not erase a successful install", async () => {
  await withPaths(async (destDir, tempDir) => {
    let markDownloadStarted: () => void = () => undefined;
    const downloadStarted = new Promise<void>((resolve) => {
      markDownloadStarted = resolve;
    });
    let rejectDownload: (error: Error) => void = () => undefined;
    const failedInstall = installArtifact({
      artifact: rawArtifact,
      download: async () => {
        markDownloadStarted();
        return new Promise<Buffer>((_resolve, reject) => {
          rejectDownload = reject;
        });
      },
      destDir,
      tmpDir: tempDir,
      platform: "darwin",
    });
    const failedResult = assert.rejects(failedInstall, /download unavailable/);

    await downloadStarted;
    const binary = Buffer.from("fake macOS binary!!!");
    const installed = await installArtifact({
      artifact: rawArtifact,
      download: async () => binary,
      destDir,
      tmpDir: tempDir,
      platform: "darwin",
    });

    rejectDownload(new Error("download unavailable"));
    await failedResult;
    assert.deepEqual(await readFile(installed), binary);
  });
});

test("does not install files left by an interrupted previous attempt", async () => {
  await withPaths(async (destDir, tempDir) => {
    await mkdir(path.join(tempDir, "install"), { recursive: true });
    await writeFile(path.join(tempDir, "install", "stale.dll"), "stale");
    await installArtifact({
      artifact: rawArtifact,
      download: async () => Buffer.from("fake macOS binary!!!"),
      destDir,
      tmpDir: tempDir,
      platform: "darwin",
    });

    await assert.rejects(access(path.join(destDir, "stale.dll")));
  });
});

test("installs Windows executable with its companion DLL", async () => {
  await withPaths(async (destDir, tempDir) => {
    const executable = Buffer.from("windows executable");
    const dll = Buffer.from([0, 1, 2, 255]);
    const archive = makeZip([
      { name: "pass-cli.exe", data: executable },
      { name: "libcrypto-3-x64.dll", data: dll },
    ]);
    const artifact: Artifact = {
      ...zipArtifact(archive),
      sha256: "cefb7a8749567974fbfcf21cfe8c515400b4730ad0efaad9b95723c33f6b0e15",
    };

    const installed = await installArtifact({
      artifact,
      download: async () => archive,
      destDir,
      tmpDir: tempDir,
      platform: "win32",
    });

    assert.equal(installed, path.join(destDir, "pass-cli.exe"));
    assert.deepEqual(await readFile(installed), executable);
    assert.deepEqual(await readFile(path.join(destDir, "libcrypto-3-x64.dll")), dll);
    await assert.rejects(access(tempDir));
  });
});

test("rejects a Windows archive missing pass-cli.exe", async () => {
  await withPaths(async (destDir, tempDir) => {
    const archive = makeZip([{ name: "libcrypto-3-x64.dll", data: Buffer.from("dll") }]);
    await assert.rejects(
      installArtifact({
        artifact: zipArtifact(archive),
        download: async () => archive,
        destDir,
        tmpDir: tempDir,
        platform: "win32",
      }),
      /ZIP does not contain pass-cli\.exe/,
    );
    await assert.rejects(access(path.join(destDir, "pass-cli.exe")));
    await assert.rejects(access(tempDir));
  });
});

test("rejects a Windows archive missing its companion DLL", async () => {
  await withPaths(async (destDir, tempDir) => {
    const archive = makeZip([{ name: "pass-cli.exe", data: Buffer.from("windows executable") }]);
    await assert.rejects(
      installArtifact({
        artifact: zipArtifact(archive),
        download: async () => archive,
        destDir,
        tmpDir: tempDir,
        platform: "win32",
      }),
      /ZIP does not contain libcrypto-3-x64\.dll/,
    );
    await assert.rejects(access(path.join(destDir, "pass-cli.exe")));
    await assert.rejects(access(tempDir));
  });
});

test("rejects ZIP traversal without writing outside installation directory", async () => {
  await withPaths(async (destDir, tempDir) => {
    const archive = makeZip([{ name: "../evil", data: Buffer.from("evil") }]);
    const escapedPath = path.join(tempDir, "evil");
    await assert.rejects(
      installArtifact({
        artifact: zipArtifact(archive),
        download: async () => archive,
        destDir,
        tmpDir: tempDir,
        platform: "win32",
      }),
      /Unsafe ZIP path/,
    );
    await assert.rejects(access(escapedPath));
    await assert.rejects(access(path.join(destDir, "pass-cli.exe")));
    await assert.rejects(access(tempDir));
  });
});
