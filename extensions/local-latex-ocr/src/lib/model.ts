import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const MODEL_VERSION = "texteller3-q4f16-ed90c61";

export type ModelAsset = {
  name: string;
  url: string;
  size: number;
  sha256: string;
};

export const MODEL_ASSETS: readonly ModelAsset[] = [
  {
    name: "onnx/encoder_model_q4f16.onnx",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/onnx/encoder_model_q4f16.onnx?download=true",
    size: 49_751_260,
    sha256: "c42190515ffcd4a728a1abee4dc8d4636b62f782fd823294d2861434a7f7d0eb",
  },
  {
    name: "onnx/decoder_model_q4f16.onnx",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/onnx/decoder_model_q4f16.onnx?download=true",
    size: 152_178_666,
    sha256: "480908c5d1aaa98b702fcad89cd4517453801695c737985bdbd2242c17ed43c1",
  },
  {
    name: "onnx/decoder_with_past_model_q4f16.onnx",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/onnx/decoder_with_past_model_q4f16.onnx?download=true",
    size: 141_378_712,
    sha256: "7786bc29efd3e96f6d7586a0a5c9a221130f0100b8bd450bd595176182a0ad81",
  },
  {
    name: "config.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/config.json?download=true",
    size: 4_667,
    sha256: "d94417e62061a944f002c9d838ef5428df99fca2b8b54b089e30a1d5964cab65",
  },
  {
    name: "generation_config.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/generation_config.json?download=true",
    size: 132,
    sha256: "6bf3790b65ff35b3f2e745c4ea71d236e3a44e23af5fb6ed3003a814871b22f1",
  },
  {
    name: "preprocessor_config.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/preprocessor_config.json?download=true",
    size: 352,
    sha256: "9e30687f05b936e9f74915206a5425d0a19517910514bca7b348e619d7ec9349",
  },
  {
    name: "tokenizer.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/tokenizer.json?download=true",
    size: 1_370_259,
    sha256: "ec4ca954798a092faf6fefcfa47fb5f85d76cdf6ab170b624ae1a683d53dae14",
  },
  {
    name: "tokenizer_config.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/tokenizer_config.json?download=true",
    size: 592_769,
    sha256: "74c8bdcd769acae371f98980fe929be1172fab3df844a50159c61998a3832eea",
  },
  {
    name: "special_tokens_map.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/special_tokens_map.json?download=true",
    size: 958,
    sha256: "f23c8e6099631c233c16d9bf8dab198f610826cdd1b358f270f6d55c1863e857",
  },
  {
    name: "vocab.json",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/vocab.json?download=true",
    size: 146_663,
    sha256: "6c5fdc7c688b7da8ca9f6abca73ff2c12c08e14386461daf9af1f0716b31e359",
  },
  {
    name: "merges.txt",
    url: "https://huggingface.co/onnx-community/TexTeller3-ONNX/resolve/ed90c6164810242882ca90863bb85697a76f4841/merges.txt?download=true",
    size: 70_943,
    sha256: "eb70ce440ef4f767138b2022ea31a6143d782f52757ae926c1d1f2182300fd0e",
  },
] as const;

export const MODEL_TOTAL_BYTES = MODEL_ASSETS.reduce((sum, asset) => sum + asset.size, 0);

export type DownloadProgress = {
  file: string;
  downloadedBytes: number;
  totalBytes: number;
  overallFraction: number;
};

export async function ensureModel(
  supportPath: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  const root = path.join(supportPath, "models");
  const modelDirectory = path.join(root, MODEL_VERSION);
  await mkdir(root, { recursive: true });
  if (await isVerified(modelDirectory)) return modelDirectory;

  const lockPath = path.join(root, `${MODEL_VERSION}.lock`);
  const ownsLock = await acquireLock(lockPath);
  if (!ownsLock) {
    await waitForModel(modelDirectory, lockPath);
    if (await isVerified(modelDirectory)) return modelDirectory;
    return ensureModel(supportPath, onProgress);
  }

  const stagingDirectory = path.join(root, `.${MODEL_VERSION}-${randomUUID()}`);
  try {
    await mkdir(stagingDirectory, { recursive: true, mode: 0o700 });
    const totalBytes = MODEL_ASSETS.reduce((sum, asset) => sum + asset.size, 0);
    let completedBytes = 0;
    for (const asset of MODEL_ASSETS) {
      await downloadAsset(asset, stagingDirectory, (downloadedBytes) => {
        onProgress?.({
          file: asset.name,
          downloadedBytes,
          totalBytes: asset.size,
          overallFraction: (completedBytes + downloadedBytes) / totalBytes,
        });
      });
      completedBytes += asset.size;
    }
    await writeFile(
      path.join(stagingDirectory, "verified.json"),
      JSON.stringify(
        { version: MODEL_VERSION, assets: MODEL_ASSETS, verifiedAt: Date.now() },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    await rm(modelDirectory, { recursive: true, force: true });
    await rename(stagingDirectory, modelDirectory);
    return modelDirectory;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
    await rm(lockPath, { force: true });
  }
}

async function isVerified(directory: string): Promise<boolean> {
  try {
    const marker = JSON.parse(await readFile(path.join(directory, "verified.json"), "utf8")) as {
      version?: string;
    };
    if (marker.version !== MODEL_VERSION) return false;
    for (const asset of MODEL_ASSETS) {
      const metadata = await stat(path.join(directory, asset.name));
      if (!metadata.isFile() || metadata.size !== asset.size) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function acquireLock(lockPath: string): Promise<boolean> {
  try {
    const handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
    await handle.close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    try {
      const lock = JSON.parse(await readFile(lockPath, "utf8")) as { createdAt?: number };
      if (Date.now() - (lock.createdAt ?? 0) > 20 * 60_000) {
        await rm(lockPath, { force: true });
        return acquireLock(lockPath);
      }
    } catch {
      await rm(lockPath, { force: true });
      return acquireLock(lockPath);
    }
    return false;
  }
}

async function waitForModel(modelDirectory: string, lockPath: string): Promise<void> {
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    if (await isVerified(modelDirectory)) return;
    try {
      await stat(lockPath);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for another model download to finish.");
}

async function downloadAsset(
  asset: ModelAsset,
  destinationDirectory: string,
  onProgress: (downloadedBytes: number) => void,
): Promise<void> {
  const response = await fetch(asset.url, { redirect: "follow" });
  if (!response.ok || !response.body)
    throw new Error(`Could not download ${asset.name}: HTTP ${response.status}`);

  const partialPath = path.join(destinationDirectory, `${asset.name}.partial`);
  const destinationPath = path.join(destinationDirectory, asset.name);
  await mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
  const file = await open(partialPath, "w", 0o600);
  const hash = createHash("sha256");
  let downloadedBytes = 0;
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      downloadedBytes += chunk.length;
      if (downloadedBytes > asset.size)
        throw new Error(`${asset.name} exceeded its expected size.`);
      hash.update(chunk);
      await file.write(chunk);
      onProgress(downloadedBytes);
    }
  } finally {
    await file.close();
  }

  if (downloadedBytes !== asset.size) {
    throw new Error(`${asset.name} has size ${downloadedBytes}, expected ${asset.size}.`);
  }
  const digest = hash.digest("hex");
  if (digest !== asset.sha256) throw new Error(`${asset.name} failed its SHA-256 integrity check.`);
  await rename(partialPath, destinationPath);
}
