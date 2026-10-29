import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import tar from "tar-stream";
import { dependencies } from "../../package.json";

// Pin the wrapper and its release artifacts together; ABI alone does not identify a compatible binary.
const VERSION = "12.11.1";
const ARCHIVES: Record<string, string> = {
  "darwin-arm64-127": "de1291398928a5cf4a5a7be388776f993ba536f9e5e2d5322e3ba5b6ac76157a",
  "darwin-x64-127": "7a8fea3a8c77653c5030fefa6d038fe91901fed127b3c0e19ef6d5061e0888ba",
  "darwin-arm64-147": "a4e4f2eb6e0254554905a7da2fc44348ab353d173ffa97aec9b080845e32dae5",
  "darwin-x64-147": "5326a88a507de1215d19c71e3405ed7279c5f5e014346591d7a214704f5b84ab",
};

function runtimeVariant(): string {
  const variables = process.config.variables as typeof process.config.variables & {
    v8_enable_pointer_compression?: number | string;
  };
  return Number(variables.v8_enable_pointer_compression) === 1 ? "compressed" : "standard";
}

export function assertSQLiteRuntime(): void {
  if (dependencies["better-sqlite3-multiple-ciphers"] !== VERSION) {
    throw new Error("SQLite package and native release versions do not match.");
  }
  if (runtimeVariant() === "compressed") {
    throw new Error("This experimental Raycast runtime needs a compatible SQLite build that is not available yet.");
  }
  if (!ARCHIVES[`${process.platform}-${process.arch}-${process.versions.modules}`]) {
    throw new Error(
      `SQLite is not available for this runtime (${process.platform}-${process.arch}, Node ${process.versions.node}).`
    );
  }
}

export function getSQLiteBindingPath(supportPath: string): string {
  return join(
    supportPath,
    "native",
    `better-sqlite3-multiple-ciphers-${VERSION}`,
    `${process.platform}-${process.arch}`,
    `node-v${process.versions.modules}-${runtimeVariant()}`,
    "better_sqlite3.node"
  );
}

export async function ensureSQLiteBinding(supportPath: string): Promise<void> {
  // Check before consulting the cache: compressed and ordinary Node 26 share the same module ABI.
  assertSQLiteRuntime();
  const destination = getSQLiteBindingPath(supportPath);
  if (existsSync(destination)) return;

  const filename = `better-sqlite3-multiple-ciphers-v${VERSION}-node-v${process.versions.modules}-${process.platform}-${process.arch}.tar.gz`;
  const url = `https://github.com/m4heshd/better-sqlite3-multiple-ciphers/releases/download/v${VERSION}/${filename}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`SQLite download failed (HTTP ${response.status}). Please try again.`);
  const archive = Buffer.from(await response.arrayBuffer());
  const expected = ARCHIVES[`${process.platform}-${process.arch}-${process.versions.modules}`];
  if (createHash("sha256").update(archive).digest("hex") !== expected) {
    throw new Error("The downloaded SQLite archive failed verification. Please try again.");
  }

  const chunks: Buffer[] = [];
  const extract = tar.extract();
  extract.on("entry", (header, stream, next) => {
    stream.on("data", (chunk: Buffer) => {
      if (header.name === "build/Release/better_sqlite3.node") chunks.push(chunk);
    });
    stream.on("end", next);
  });
  await pipeline(Readable.from([archive]), createGunzip(), extract);
  if (chunks.length === 0) throw new Error("The SQLite archive does not contain its native binding.");

  // Publish only a complete binary. Each command gets its own staging directory, including concurrent starts.
  await mkdir(dirname(destination), { recursive: true });
  const temporary = await mkdtemp(join(dirname(destination), ".download-"));
  try {
    const file = join(temporary, "better_sqlite3.node");
    await writeFile(file, Buffer.concat(chunks));
    await rename(file, destination);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
