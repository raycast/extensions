import { environment } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

const CACHE_DIR = join(environment.supportPath, "bin");
const BINARY_PATH = join(CACHE_DIR, "toggle-chrome-sidebar");
const HASH_PATH = join(CACHE_DIR, "toggle-chrome-sidebar.sha256");
const SWIFT_SOURCE = join(
  environment.assetsPath,
  "toggle-chrome-sidebar.swift",
);

function sourceHash(): string {
  const content = readFileSync(SWIFT_SOURCE);
  return createHash("sha256").update(content).digest("hex");
}

function isCacheValid(): boolean {
  if (!existsSync(BINARY_PATH) || !existsSync(HASH_PATH)) return false;
  const cached = readFileSync(HASH_PATH, "utf-8").trim();
  return cached === sourceHash();
}

export function ensureBinary(): string {
  if (isCacheValid()) return BINARY_PATH;

  mkdirSync(CACHE_DIR, { recursive: true });
  execFileSync("swiftc", ["-O", SWIFT_SOURCE, "-o", BINARY_PATH]);
  writeFileSync(HASH_PATH, sourceHash());

  return BINARY_PATH;
}
