import { Toast, showToast } from "@raycast/api";
import { createReadStream, existsSync, renameSync, rmSync } from "fs";
import { createHash } from "crypto";
import { dirname } from "path";
import {
  defaultModelPath,
  defaultVadModelPath,
  ensureSupportDirectories,
} from "./lib/paths";
import { runFile } from "./lib/process";

const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin";
const VAD_MODEL_URL =
  "https://huggingface.co/ggml-org/whisper-vad/resolve/9ffd54a1e1ee413ddf265af9913beaf518d1639b/ggml-silero-v6.2.0.bin";
const MODEL_SHA256 =
  "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe";
const VAD_MODEL_SHA256 =
  "2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987";

function sha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function isValid(path: string, expectedSha256: string): Promise<boolean> {
  return existsSync(path) && (await sha256(path)) === expectedSha256;
}

async function downloadFile(
  url: string,
  destination: string,
  expectedSha256: string,
): Promise<void> {
  const partialPath = `${destination}.partial`;
  rmSync(partialPath, { force: true });
  try {
    await runFile("/usr/bin/curl", [
      "-L",
      "--fail",
      "--retry",
      "3",
      "-o",
      partialPath,
      url,
    ]);
    const actualSha256 = await sha256(partialPath);
    if (actualSha256 !== expectedSha256) {
      throw new Error(
        `Downloaded model failed integrity verification (expected ${expectedSha256}, got ${actualSha256})`,
      );
    }
    renameSync(partialPath, destination);
  } catch (error) {
    rmSync(partialPath, { force: true });
    throw error;
  }
}

export default async function Command() {
  ensureSupportDirectories();
  const modelPath = defaultModelPath();
  const vadModelPath = defaultVadModelPath();
  const modelIsValid = await isValid(modelPath, MODEL_SHA256);
  const vadModelIsValid = await isValid(vadModelPath, VAD_MODEL_SHA256);
  if (modelIsValid && vadModelIsValid) {
    await showToast({
      style: Toast.Style.Success,
      title: "Local transcription models are already installed",
      message: dirname(modelPath),
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading local transcription models…",
    message: dirname(modelPath),
  });
  try {
    if (!modelIsValid) {
      rmSync(modelPath, { force: true });
      await downloadFile(MODEL_URL, modelPath, MODEL_SHA256);
    }
    if (!vadModelIsValid) {
      rmSync(vadModelPath, { force: true });
      await downloadFile(VAD_MODEL_URL, vadModelPath, VAD_MODEL_SHA256);
    }
    toast.style = Toast.Style.Success;
    toast.title = "Local transcription models installed";
    toast.message = dirname(modelPath);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Model download failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
