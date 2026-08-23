import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export type QrErrorLevel = "L" | "M" | "Q" | "H";

export type QrOptions = {
  data: string;
  size: number;
  foreground: string;
  background: string;
  logo?: string;
  errorLevel: QrErrorLevel;
};

export type QrResult = QrOptions & {
  outputPath: string;
  vCardText?: string;
};

export function getQrOutputPath({
  data,
  size,
  foreground,
  background,
  logo,
  errorLevel,
}: QrOptions): string {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({ data, size, foreground, background, logo, errorLevel }),
    )
    .digest("hex")
    .slice(0, 16);

  return join(getDefaultOutputRoot(), "qr", `qr-${size}-${hash}.png`);
}

export async function generateQr(options: QrOptions): Promise<QrResult> {
  const outputPath = getQrOutputPath(options);
  await mkdir(dirname(outputPath), { recursive: true });

  const args = [
    "qr",
    "--quiet",
    "--size",
    String(options.size),
    "--fg",
    options.foreground,
    "--bg",
    options.background,
    "--error-level",
    options.errorLevel,
    "--output",
    outputPath,
    options.data,
  ];

  if (options.logo) {
    // Inserts the logo parameter before the positional <DATA> argument
    args.splice(args.length - 1, 0, "--logo", options.logo);
  }

  await execFileAsync(getDelphitoolsCliPath(), args);

  return {
    ...options,
    outputPath,
  };
}

export function parsePositiveInteger(
  value: string,
  label: string,
): number | Error {
  const parsed = Number(value.trim());

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return new Error(`${label} must be a positive whole number.`);
  }

  return parsed;
}

export function validateLogoSelection(logoFiles?: string[]): string | null {
  if (!logoFiles || logoFiles.length === 0) {
    return null;
  }
  if (logoFiles.length > 1) {
    return "Choose only one logo file";
  }
  const extension = join(".", logoFiles[0]).split(".").pop()?.toLowerCase();
  if (extension !== "png") {
    return "Choose a PNG file for the logo";
  }
  return null;
}
