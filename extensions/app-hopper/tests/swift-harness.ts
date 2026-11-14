import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const assetPath = (name: string) => path.join(__dirname, "..", "assets", name);
const fixturePath = (name: string) => path.join(__dirname, "fixtures", name);
const readAsset = (name: string) => fs.readFileSync(assetPath(name), "utf8");
const readFixture = (name: string) => fs.readFileSync(fixturePath(name), "utf8");

function swiftFunction(source: string, name: string) {
  const start = source.indexOf(`func ${name}(`);
  assert(start >= 0, `Missing Swift function: ${name}`);
  const remainder = source.slice(start + 1);
  const nextDeclaration = remainder.search(/\n(?:func |@main\b|(?:private )?(?:enum|class|struct) )/);
  return nextDeclaration < 0 ? source.slice(start) : source.slice(start, start + 1 + nextDeclaration);
}

function runSwiftHarness(source: string, additionalSources: string[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "app-hopper-swift-test-"));
  try {
    const main = path.join(dir, "main.swift");
    const binary = path.join(dir, "test");
    fs.writeFileSync(main, source);
    execFileSync(
      "/usr/bin/swiftc",
      ["-module-cache-path", path.join(dir, "cache"), main, ...additionalSources, "-o", binary],
      {
        timeout: 30000,
      },
    );
    return execFileSync(binary, [], { timeout: 5000, encoding: "utf8" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export { assetPath, fixturePath, readAsset, readFixture, swiftFunction, runSwiftHarness };
