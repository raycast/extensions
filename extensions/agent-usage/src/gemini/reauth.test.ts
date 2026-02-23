import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

test("shouldPromptGeminiReauth returns true only for unauthorized errors that have not been prompted", async () => {
  const { shouldPromptGeminiReauth } = await import("./reauth");

  assert.equal(shouldPromptGeminiReauth("unauthorized", false), true);
  assert.equal(shouldPromptGeminiReauth("unauthorized", true), false);
  assert.equal(shouldPromptGeminiReauth("network_error", false), false);
  assert.equal(shouldPromptGeminiReauth(undefined, false), false);
});

test("getGeminiReauthCommand prefers GEMINI_PATH when provided", async () => {
  const { getGeminiReauthCommand } = await import("./reauth");

  const previousGeminiPath = process.env.GEMINI_PATH;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-path-"));
  const customGeminiPath = path.join(tempDir, "gemini");

  fs.writeFileSync(customGeminiPath, "#!/bin/sh\n", "utf-8");
  process.env.GEMINI_PATH = customGeminiPath;

  try {
    assert.equal(getGeminiReauthCommand(), customGeminiPath);
  } finally {
    if (previousGeminiPath) {
      process.env.GEMINI_PATH = previousGeminiPath;
    } else {
      delete process.env.GEMINI_PATH;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
