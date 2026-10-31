import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const checkout = resolve(process.argv[2] ?? "../glimmer");
const fixtureDirectory = new URL("../tests/fixtures/glimmer/", import.meta.url);
const sources = [
  "Glimmer/CLI/GlimmerCLI+JSON.swift",
  "Glimmer/CLI/GlimmerCLI+URL.swift",
  "GlimmerEngine/Models/GlimmerCommandURL.swift",
];
const contents = sources.map((path) => readFileSync(join(checkout, path), "utf8"));
const encoder = contents[0].slice(
  contents[0].indexOf("enum CommandJSON {"),
  contents[0].indexOf("\nextension GlimmerCLI {"),
);
if (!encoder.startsWith("enum CommandJSON {") || !contents[1].includes("static func parseURL")) {
  throw new Error("Glimmer's source layout changed; review the fixture generator.");
}
const work = mkdtempSync(join(tmpdir(), "glimmer-contract-"));
try {
  // Compile the shared URL parser as its real module; the Mac wrapper imports it.
  const engine = join(work, "GlimmerEngine.swift");
  const engineObject = join(work, "GlimmerEngine.o");
  writeFileSync(engine, contents[2]);
  execFileSync("swiftc", [
    "-module-cache-path",
    join(work, "modules"),
    "-parse-as-library",
    "-emit-module",
    "-emit-object",
    "-module-name",
    "GlimmerEngine",
    "-emit-module-path",
    join(work, "GlimmerEngine.swiftmodule"),
    engine,
    "-o",
    engineObject,
  ]);
  const main = join(work, "main.swift");
  writeFileSync(
    main,
    [encoder, contents[1], readFileSync(new URL("generate.swift", fixtureDirectory), "utf8")].join("\n"),
  );
  execFileSync("swiftc", [
    "-module-cache-path",
    join(work, "modules"),
    "-I",
    work,
    main,
    engineObject,
    "-o",
    join(work, "generate"),
  ]);
  const fixture = JSON.parse(execFileSync(join(work, "generate"), { encoding: "utf8" }));
  fixture.source = {
    repository: "https://github.com/Se7enbrc/glimmer",
    revision: execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sha256: Object.fromEntries(
      sources.map((path, index) => [path, createHash("sha256").update(contents[index]).digest("hex")]),
    ),
  };
  writeFileSync(new URL("contract-v1.json", fixtureDirectory), JSON.stringify(fixture, null, 2) + "\n");
} finally {
  rmSync(work, { recursive: true, force: true });
}
