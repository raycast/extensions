import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

test("findLatestMiseGeminiBinaryPath returns the highest installed node version binary", async () => {
  const { findLatestMiseGeminiBinaryPath } = await import("./binary");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-mise-"));

  const lowerVersionPath = path.join(tempDir, "20.18.0", "bin");
  const higherVersionPath = path.join(tempDir, "24.9.0", "bin");

  fs.mkdirSync(lowerVersionPath, { recursive: true });
  fs.mkdirSync(higherVersionPath, { recursive: true });

  const lowerGeminiPath = path.join(lowerVersionPath, "gemini");
  const higherGeminiPath = path.join(higherVersionPath, "gemini");

  fs.writeFileSync(lowerGeminiPath, "#!/bin/sh\n", "utf-8");
  fs.writeFileSync(higherGeminiPath, "#!/bin/sh\n", "utf-8");
  fs.chmodSync(lowerGeminiPath, 0o755);
  fs.chmodSync(higherGeminiPath, 0o755);

  try {
    assert.equal(findLatestMiseGeminiBinaryPath(tempDir), higherGeminiPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("resolveGeminiBinaryPath ignores non-executable GEMINI_PATH", async () => {
  const { resolveGeminiBinaryPath } = await import("./binary");

  const previousGeminiPath = process.env.GEMINI_PATH;
  const previousGeminiCliPath = process.env.GEMINI_CLI_PATH;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-bin-"));
  const nonExecutableGeminiPath = path.join(tempDir, "gemini");

  fs.writeFileSync(nonExecutableGeminiPath, "#!/bin/sh\n", "utf-8");
  fs.chmodSync(nonExecutableGeminiPath, 0o644);

  process.env.GEMINI_PATH = nonExecutableGeminiPath;
  delete process.env.GEMINI_CLI_PATH;

  try {
    assert.notEqual(resolveGeminiBinaryPath(), nonExecutableGeminiPath);
  } finally {
    if (previousGeminiPath === undefined) {
      delete process.env.GEMINI_PATH;
    } else {
      process.env.GEMINI_PATH = previousGeminiPath;
    }

    if (previousGeminiCliPath === undefined) {
      delete process.env.GEMINI_CLI_PATH;
    } else {
      process.env.GEMINI_CLI_PATH = previousGeminiCliPath;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
