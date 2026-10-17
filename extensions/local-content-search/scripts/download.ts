import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, mkdir, rename, statfs } from "node:fs/promises";
import { join } from "node:path";
import { totalmem } from "node:os";
import { paths } from "../service/paths";

// Pin both GGUF files and verify their hashes before native inference can load them.
const REVISION = "bfcd298762cc34d0357ece5ebdd31791a3a374d8";
const REPOSITORY = "ggml-org/embeddinggemma-2-GGUF";
const MODEL_FILES = [
  {
    name: "embeddinggemma-2-Q8_0.gguf",
    bytes: 309855456,
    sha256: "2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135",
  },
  {
    name: "mmproj-embeddinggemma-2-Q8_0.gguf",
    bytes: 554821024,
    sha256: "c4a8a52691ecef40618438928bdf9e68379b854e24166f292592353db0aab64f",
  },
];
const MIN_SYSTEM_BYTES = 8 * 1024 ** 3;
const DISK_RESERVE_BYTES = 2 * 1024 ** 3;

async function hash(path: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    digest.update(chunk);
  }
  return digest.digest("hex");
}

async function main(): Promise<void> {
  if (totalmem() < MIN_SYSTEM_BYTES) {
    throw new Error("At least 8 GB memory is required");
  }
  const locations = paths(process.env.LOCAL_SEARCH_HOME);
  await mkdir(locations.models, { recursive: true, mode: 0o700 });
  const disk = await statfs(locations.models);
  if (
    disk.bavail * disk.bsize <
    DISK_RESERVE_BYTES + MODEL_FILES.reduce((sum, file) => sum + file.bytes, 0)
  ) {
    throw new Error(
      "Not enough disk space; keep at least 2 GB free after downloading",
    );
  }
  for (const file of MODEL_FILES) {
    const target = join(locations.models, file.name);
    if (
      await hash(target)
        .then((value) => value === file.sha256)
        .catch(() => false)
    ) {
      console.log(`Verified ${file.name}`);
      continue;
    }
    console.log(
      `Downloading ${file.name} (${Math.round(file.bytes / 1024 ** 2)} MB)`,
    );
    const response = await fetch(
      `https://huggingface.co/${REPOSITORY}/resolve/${REVISION}/${file.name}`,
      { signal: AbortSignal.timeout(20 * 60 * 1000) },
    );
    if (!response.ok || !response.body) {
      throw new Error(`Model download returned ${response.status}`);
    }
    const handle = await open(`${target}.partial`, "w", 0o600);
    const digest = createHash("sha256");
    let bytes = 0;
    try {
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > file.bytes) {
          throw new Error("Model download exceeded its expected size");
        }
        digest.update(chunk);
        await handle.writeFile(chunk);
      }
    } finally {
      await handle.close();
    }
    if (bytes !== file.bytes || digest.digest("hex") !== file.sha256) {
      throw new Error(
        `Checksum mismatch for ${file.name}; partial file was not installed`,
      );
    }
    await rename(`${target}.partial`, target);
    console.log(`Verified and installed ${file.name}`);
  }
  console.log("EmbeddingGemma 2 is ready for offline use.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
