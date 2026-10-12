import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("native masks replace intended pixels and numeric candidates classify independently", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "hide-details-native-test-"));
  try {
    copyFileSync(path.join(root, "tests/native-redaction.swift"), path.join(directory, "main.swift"));
    const executable = path.join(directory, "native-redaction");
    execFileSync(
      "xcrun",
      [
        "swiftc",
        "-module-cache-path",
        path.join(directory, "module-cache"),
        path.join(root, "swift/hide-details/Sources/Redaction.swift"),
        path.join(directory, "main.swift"),
        "-o",
        executable,
      ],
      { encoding: "utf8", stdio: "pipe", timeout: 60_000 },
    );
    execFileSync(executable, { encoding: "utf8", stdio: "pipe", timeout: 30_000 });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
