import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

// Compile the production functions without its CLI entry point. Inject failures
// without changing real display power or the user's cache.
const directory = mkdtempSync(join(tmpdir(), "display-switch-test-"));
try {
  const source = readFileSync("native/DisplayControl.swift", "utf8").split("// CLI entry point.")[0];
  const harness = `
let valid = "11111111-1111-1111-1111-111111111111"
let identified = identifiedIDs([1, 2, 3]) { $0 == 2 ? nil : valid }
precondition(identified.map { $0.0 } == [1, 3], "Missing UUID must not discard valid displays")
precondition(bestEffortLayout {} == nil)
for stage in ["Begin layout restore", "Restore resolution", "Restore position", "Restore display layout"] {
    let warning = bestEffortLayout { throw Failure.message(stage + " failed") }
    precondition(warning?.contains(stage) == true)
    try output([Display(id: valid, name: "Test Display", enabled: true, builtIn: false, main: false,
                        mirrored: false, width: 1920, height: 1080, warning: warning)])
}
`;
  const path = join(directory, "main.swift");
  const binary = join(directory, "test-native");
  writeFileSync(path, source + harness);
  execFileSync("xcrun", ["swiftc", path, "-o", binary], { stdio: "inherit" });
  const results = execFileSync(binary, { encoding: "utf8" }).trim().split("\n").map(JSON.parse);
  assert.equal(results.length, 4);
  for (const result of results) {
    assert.equal(result[0].enabled, true);
    assert.match(result[0].warning, /Display is on/);
  }
  console.log("Native regressions passed: missing UUID isolation and all four layout failure stages.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
