import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { DETECT_LANGUAGE_INSTRUCTIONS, OCR_INSTRUCTIONS } from "./instructions";

const execFileAsync = promisify(execFile);

/** Apple's on-device Foundation Model CLI (`fm`), installed at /usr/bin/fm. */
const FM_PATH = "/usr/bin/fm";

export class LicenseNotAgreedError extends Error {
  constructor() {
    super("Apple Foundation Models terms not accepted");
  }
}

async function assertLicenseAgreed() {
  if (!existsSync(FM_PATH)) {
    throw new Error(
      "Requires macOS 26 or later with Apple Intelligence enabled",
    );
  }
  try {
    const { stdout } = await execFileAsync(FM_PATH, ["license", "--status"]);
    if (/^Agreed/.test(stdout.trim())) return;
  } catch {
    // a failing status check means the terms were not agreed to
  }
  throw new LicenseNotAgreedError();
}

export async function fmLicenseText(): Promise<string> {
  const { stdout } = await execFileAsync(FM_PATH, ["license", "--show"]);
  return stdout.trim();
}

export async function fmTransform(
  instructionsFor: (language: string) => string,
  text: string,
): Promise<string> {
  await assertLicenseAgreed();
  const language = (
    await fmRespond(DETECT_LANGUAGE_INSTRUCTIONS, text)
  ).replace(/[^A-Za-z]/g, "");
  return fmRespond(instructionsFor(language), text);
}

export async function fmOcr(imagePath: string): Promise<string> {
  await assertLicenseAgreed();
  const { stdout } = await execFileAsync(FM_PATH, [
    "respond",
    "--no-stream",
    "--greedy",
    "--tool",
    "ocr",
    "--image",
    imagePath,
    "--instructions",
    OCR_INSTRUCTIONS,
    "Extract the text from the image.",
  ]);
  return stdout.trim();
}

async function fmRespond(instructions: string, text: string): Promise<string> {
  const { stdout } = await execFileAsync(FM_PATH, [
    "respond",
    "--no-stream",
    "--greedy",
    "--instructions",
    instructions,
    text,
  ]);
  return stdout.trim();
}
