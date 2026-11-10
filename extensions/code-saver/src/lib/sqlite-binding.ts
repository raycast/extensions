import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import tar from "tar-stream";
import { dependencies } from "../../package.json";

// Pin the wrapper and the npm archive containing its Node-API prebuilds together.
const VERSION = "13.0.3";
const NAPI_VERSION = 10;
const PACKAGE_SHA512 = "UYabM82r1J84TLWc/SszoHs6XopWpl/2HCg3Nui1JUaFXg/VLswzkPowYiRhK/4CftI8dgtikwyZQecMldrGxQ==";

export function assertSQLiteRuntime(): void {
  if (dependencies["better-sqlite3-multiple-ciphers"] !== VERSION) {
    throw new Error("SQLite package and native release versions do not match.");
  }
  if (process.platform !== "darwin" || !["arm64", "x64"].includes(process.arch)) {
    throw new Error(`SQLite is not available for this platform (${process.platform}-${process.arch}).`);
  }
  if (Number(process.versions.napi || 0) < NAPI_VERSION) {
    throw new Error("This SQLite build requires Node-API 10. Please update Raycast and try again.");
  }
}

export function getSQLiteBindingPath(supportPath: string): string {
  return join(
    supportPath,
    "native",
    `better-sqlite3-multiple-ciphers-${VERSION}`,
    `${process.platform}-${process.arch}`,
    `napi-v${NAPI_VERSION}`,
    "better_sqlite3.node"
  );
}

export async function ensureSQLiteBinding(supportPath: string): Promise<void> {
  // Node-API prebuilds work with ordinary and compressed V8 layouts. Keep them separate from the old ABI caches.
  assertSQLiteRuntime();
  const destination = getSQLiteBindingPath(supportPath);
  if (existsSync(destination)) return;

  const url = `https://registry.npmjs.org/better-sqlite3-multiple-ciphers/-/better-sqlite3-multiple-ciphers-${VERSION}.tgz`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`SQLite download failed (HTTP ${response.status}). Please try again.`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (createHash("sha512").update(archive).digest("base64") !== PACKAGE_SHA512) {
    throw new Error("The downloaded SQLite archive failed verification. Please try again.");
  }

  const chunks: Buffer[] = [];
  const extract = tar.extract();
  extract.on("entry", (header, stream, next) => {
    stream.on("data", (chunk: Buffer) => {
      if (header.type === "file" && header.name === `package/prebuilds/${process.platform}-${process.arch}.node`)
        chunks.push(chunk);
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
