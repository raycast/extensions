import { Toast, showToast } from "@raycast/api";
import { createReadStream, existsSync, renameSync, rmSync } from "fs";
import { createHash } from "crypto";
import { dirname } from "path";
import { defaultModelPath, ensureSupportDirectories } from "./lib/paths";
import { runFile } from "./lib/process";

const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin";
const MODEL_SHA256 =
  "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe";

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
  const modelIsValid = await isValid(modelPath, MODEL_SHA256);
  if (modelIsValid) {
    await showToast({
      style: Toast.Style.Success,
      title: "Local Whisper model is already installed",
      message: dirname(modelPath),
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading local Whisper model…",
    message: dirname(modelPath),
  });
  try {
    if (!modelIsValid) {
      rmSync(modelPath, { force: true });
      await downloadFile(MODEL_URL, modelPath, MODEL_SHA256);
    }
    toast.style = Toast.Style.Success;
    toast.title = "Local Whisper model installed";
    toast.message = dirname(modelPath);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Model download failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
