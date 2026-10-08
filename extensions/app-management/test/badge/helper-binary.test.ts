// Copied from badge-count-raycast test/helper-binary.test.ts on 2026-09-30, unchanged except this header, paths, and a second binary (window-helper) with its SOURCES.sha256
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { openSync, readdirSync, readFileSync, readSync, closeSync, statSync } from "node:fs";
import { join } from "node:path";

// The compiled helper is committed for the Store (SPEC-STORE.md D1, T1 to T3).
const root = process.cwd(); // npm test runs from the repository root
const binaries = {
  "dock-badges": join(root, "assets", "dock-badges"),
  "window-helper": join(root, "assets", "window-helper"),
};

/** SPEC.md §10.4: the two binaries' hashes as observed on 2026-09-30 and verified byte-identical to the installed copies;
 * window-helper rebuilt 2026-10-08 for the `close` command (Close.swift). */
const RECORDED_BINARY_SHA256 = {
  "dock-badges": "9d16509531b9bc9ebd6dea6b07f805da34f81799aebd5274c6b0b4efafcd9af5",
  "window-helper": "476c52d57ce49373048456c6f392c5ec5e9d8999520ff87a0724a9ede40d2f86",
};

for (const [name, binary] of Object.entries(binaries)) {
  describe(`committed helper binary ${name} (T1)`, () => {
    it("exists and has the executable bit", () => {
      const { mode } = statSync(binary);
      assert.notEqual(mode & 0o100, 0, `mode ${mode.toString(8)}`);
    });

    it("is a 64-bit arm64 Mach-O executable", () => {
      const header = Buffer.alloc(8);
      const fd = openSync(binary, "r");
      try {
        readSync(fd, header, 0, 8, 0);
      } finally {
        closeSync(fd);
      }
      assert.equal(header.readUInt32LE(0), 0xfeedfacf, "MH_MAGIC_64");
      assert.equal(header.readUInt32LE(4), 0x0100000c, "CPU_TYPE_ARM64");
    });

    it("has the SHA-256 recorded in SPEC.md §10.4 (provenance)", () => {
      const actual = createHash("sha256").update(readFileSync(binary)).digest("hex");
      assert.equal(actual, RECORDED_BINARY_SHA256[name as keyof typeof RECORDED_BINARY_SHA256]);
    });
  });
}

describe("helper sources match their recorded hashes (T2)", () => {
  it("SHA-256 of helper/badge/dock-badges.swift equals helper/badge/dock-badges.swift.sha256", () => {
    const recorded = readFileSync(join(root, "helper", "badge", "dock-badges.swift.sha256"), "utf8")
      .trim()
      .split(/\s+/)[0];
    const actual = createHash("sha256")
      .update(readFileSync(join(root, "helper", "badge", "dock-badges.swift")))
      .digest("hex");
    assert.equal(actual, recorded, "source changed: run npm run build:helper:badge and commit the binary and hash");
  });

  it("every helper/window/*.swift matches helper/window/SOURCES.sha256, and nothing is missing", () => {
    const dir = join(root, "helper", "window");
    const lines = readFileSync(join(dir, "SOURCES.sha256"), "utf8").trim().split("\n");
    const recorded = new Map(lines.map((l) => [l.trim().split(/\s+/)[1], l.trim().split(/\s+/)[0]]));
    const files = readdirSync(dir).filter((f) => f.endsWith(".swift")).sort();
    assert.deepEqual(files, [...recorded.keys()].sort());
    for (const f of files) {
      const actual = createHash("sha256").update(readFileSync(join(dir, f))).digest("hex");
      assert.equal(actual, recorded.get(f), `${f} changed: run npm run build:helper:window and commit the binary and hashes`);
    }
  });
});

describe("build scripts need no Swift toolchain (T3, scripts part)", () => {
  const { scripts } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  for (const name of ["build", "dev", "lint", "test", "typecheck"]) {
    it(`${name} does not run swiftc`, () => {
      assert.ok(scripts[name], `${name} script exists`);
      assert.ok(!scripts[name].includes("swiftc"), scripts[name]);
      assert.ok(!scripts[name].includes("build:helper"), scripts[name]);
      assert.ok(!scripts[name].includes("swift"), scripts[name]);
    });
  }
});
