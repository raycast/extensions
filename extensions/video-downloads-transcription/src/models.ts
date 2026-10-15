import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, open, rename, rm, stat, statfs } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { formatSize, run } from "./core";

/** A whisper.cpp model on Hugging Face, with its checksum. */
export type CatalogModel = {
  /** The name in `ggml-<name>.bin`. */
  name: string;
  size: number;
  sha256: string;
  description: string;
  /** The Core ML encoder, for models that have one; quantized models use their base model's. */
  encoder?: { size: number; sha256: string };
};

const repository = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";

/** Models offered in Manage Tools and Models, most useful first. */
export const modelCatalog: CatalogModel[] = [
  {
    name: "large-v3-turbo",
    size: 1624555275,
    sha256: "1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69",
    description: "Recommended: fast and nearly as accurate as large-v3",
    encoder: {
      size: 1173393014,
      sha256:
        "84bedfe895bd7b5de6e8e89a0803dfc5addf8c0c5bc4c937451716bf7cf7988a",
    },
  },
  {
    name: "large-v3-turbo-q8_0",
    size: 874188075,
    sha256: "317eb69c11673c9de1e1f0d459b253999804ec71ac4c23c17ecf5fbe24e259a1",
    description: "Smaller turbo with almost the same results",
  },
  {
    name: "large-v3-turbo-q5_0",
    size: 574041195,
    sha256: "394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2",
    description: "Smallest turbo, slightly less accurate",
  },
  {
    name: "large-v3",
    size: 3095033483,
    sha256: "64d182b440b98d5203c4f9bd541544d84c605196c4f7b845dfa11fb23594d1e2",
    description: "Most accurate and slowest; can translate",
    encoder: {
      size: 1175711232,
      sha256:
        "47837be7594a29429ec08620043390c4d6d467f8bd362df09e9390ace76a55a4",
    },
  },
  {
    name: "large-v3-q5_0",
    size: 1081140203,
    sha256: "d75795ecff3f83b5faa89d1900604ad8c780abd5739fae406de19f23ecd98ad1",
    description: "Smaller large-v3, slightly less accurate; can translate",
  },
  {
    name: "medium",
    size: 1533763059,
    sha256: "6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208",
    description: "Faster than large-v3, less accurate; can translate",
    encoder: {
      size: 567829413,
      sha256:
        "79b0b8d436d47d3f24dd3afc91f19447dd686a4f37521b2f6d9c30a642133fbd",
    },
  },
  {
    name: "medium-q5_0",
    size: 539212467,
    sha256: "19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f",
    description: "Smaller medium; can translate",
  },
  {
    name: "small",
    size: 487601967,
    sha256: "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
    description: "Fast, for clear speech in common languages",
    encoder: {
      size: 163083239,
      sha256:
        "de43fb9fed471e95c19e60ae67575c2bf09e8fb607016da171b06ddad313988b",
    },
  },
  {
    name: "base",
    size: 147951465,
    sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
    description: "Very fast, least accurate",
    encoder: {
      size: 37922638,
      sha256:
        "7e6ab77041942572f239b5b602f8aaa1c3ed29d73e3d8f20abea03a773541089",
    },
  },
];

/** The model a quantized model is made from, such as `large-v3` for `large-v3-q5_0`. */
export function baseModelName(name: string): string {
  return name.replace(/-q\d_\d$/, "");
}

/** The Core ML encoder for a model name, when one can be downloaded. */
export function catalogEncoder(
  name: string,
): { name: string; size: number; sha256: string } | undefined {
  const base = baseModelName(name);
  const encoder = modelCatalog.find((model) => model.name === base)?.encoder;
  return encoder && { name: base, ...encoder };
}

/** The folder models are downloaded to. */
export function modelsFolder(supportPath: string): string {
  return join(supportPath, "models");
}

async function hashFile(path: string, hash: ReturnType<typeof createHash>) {
  for await (const chunk of createReadStream(path)) hash.update(chunk);
}

/** Fails early when a download won't fit on the disk. */
async function checkSpace(folder: string, size: number) {
  try {
    const { bavail, bsize } = await statfs(folder);
    const free = bavail * bsize;
    if (free < size * 1.05 + 200_000_000)
      throw new Error(
        `Not enough disk space: this needs ${formatSize(size)}, and ${formatSize(free)} is free.`,
      );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Not enough"))
      throw error;
  }
}

/**
 * Downloads a file and checks its SHA-256 checksum. A download that fails
 * or is stopped, other than by canceling, is kept as `.part` and continues
 * where it stopped the next time.
 */
export async function downloadFile(
  url: string,
  target: string,
  expected: { size: number; sha256: string },
  onProgress?: (received: number, total: number) => void,
  signal?: AbortSignal,
) {
  await mkdir(dirname(target), { recursive: true });
  const partial = `${target}.part`;
  const hash = createHash("sha256");
  let offset = 0;
  try {
    offset = (await stat(partial)).size;
  } catch {
    /* nothing downloaded yet */
  }
  if (offset > expected.size) {
    await rm(partial, { force: true });
    offset = 0;
  }
  await checkSpace(dirname(target), expected.size - offset);
  if (offset) await hashFile(partial, hash);
  const response = await fetch(url, {
    signal,
    headers: offset ? { Range: `bytes=${offset}-` } : undefined,
  });
  if (!response.ok || !response.body)
    throw new Error(
      `Hugging Face returned HTTP ${response.status} for ${basename(target)}.`,
    );
  // A server that ignores the range sends the whole file again.
  if (offset && response.status !== 206) {
    await response.body.cancel();
    await rm(partial, { force: true });
    return await downloadFile(url, target, expected, onProgress, signal);
  }
  const file = await open(partial, offset ? "a" : "w");
  let received = offset;
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      hash.update(chunk);
      await file.write(chunk);
      received += chunk.length;
      onProgress?.(received, expected.size);
    }
  } catch (error) {
    // Canceling discards the download; other failures keep it to continue later.
    if (signal?.aborted) {
      await file.close();
      await rm(partial, { force: true });
    }
    throw error;
  } finally {
    await file.close().catch(() => undefined);
  }
  if (received !== expected.size || hash.digest("hex") !== expected.sha256) {
    await rm(partial, { force: true });
    throw new Error(
      `The download of ${basename(target)} was damaged. Try again.`,
    );
  }
  await rename(partial, target);
}

function progressMessage(
  label: string,
  onProgress?: (message: string) => void,
) {
  let last = -1;
  return (received: number, total: number) => {
    const percent = Math.floor((received / total) * 100);
    if (percent === last) return;
    last = percent;
    onProgress?.(
      `Downloading ${label}… ${percent}% · ${formatSize(received)} of ${formatSize(total)}`,
    );
  };
}

/** Downloads a whisper model into a folder and returns its path. */
export async function downloadModel(
  name: string,
  folder: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const model = modelCatalog.find((item) => item.name === name);
  if (!model) throw new Error(`${name} can't be downloaded.`);
  const target = join(folder, `ggml-${name}.bin`);
  if (existsSync(target)) return target;
  await downloadFile(
    `${repository}/ggml-${name}.bin`,
    target,
    model,
    progressMessage(name, onProgress),
    signal,
  );
  return target;
}

/**
 * Downloads the Core ML encoder for a model into the model's folder, where
 * whisper.cpp looks for it, and returns its path.
 */
export async function downloadEncoder(
  modelPath: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const name = basename(modelPath)
    .replace(/^ggml-/, "")
    .replace(/\.bin$/, "");
  const encoder = catalogEncoder(name);
  if (!encoder)
    throw new Error(`There's no Core ML encoder to download for ${name}.`);
  const folder = dirname(modelPath);
  const target = join(folder, `ggml-${encoder.name}-encoder.mlmodelc`);
  if (existsSync(target)) return target;
  const zip = `${target}.zip`;
  await downloadFile(
    `${repository}/ggml-${encoder.name}-encoder.mlmodelc.zip`,
    zip,
    encoder,
    progressMessage(`Core ML encoder for ${encoder.name}`, onProgress),
    signal,
  );
  onProgress?.("Unpacking Core ML encoder…");
  const unpacked = join(folder, `.ggml-${encoder.name}-encoder.${process.pid}`);
  try {
    await run("/usr/bin/ditto", ["-x", "-k", zip, unpacked], undefined, signal);
    await rename(join(unpacked, basename(target)), target);
    await rm(zip, { force: true });
  } finally {
    await rm(unpacked, { recursive: true, force: true });
  }
  return target;
}
