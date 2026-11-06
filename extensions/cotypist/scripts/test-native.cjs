const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "cotypist-native-test-"),
);
try {
  const suites = [
    {
      name: "locator",
      sources: [
        "assets/control-locator.swift",
        "tests/native-locator-tests.swift",
      ],
    },
    {
      name: "snapshot",
      sources: [
        "assets/control-locator.swift",
        "assets/snapshot-policy.swift",
        "tests/native-snapshot-tests.swift",
      ],
    },
  ];
  for (const suite of suites) {
    const binary = path.join(temporary, suite.name);
    execFileSync(
      "/usr/bin/swiftc",
      ["-O", "-parse-as-library", ...suite.sources, "-o", binary],
      { stdio: "inherit", timeout: 60000 },
    );
    execFileSync(binary, [], { stdio: "inherit", timeout: 5000 });
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
