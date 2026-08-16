import fs from "fs";
import { spawn } from "child_process";
import { PDFDocument } from "pdf-lib";
import { CompressionOptions, CompressionResult } from "./types";
import { generateOutputPath, calculateCompressionRatio } from "../utils/format";
import { getAugmentedEnv } from "../utils/system";

async function isGhostscriptAvailable(): Promise<string | null> {
  const binaries = ["gswin64c", "gswin32c", "gs"];
  for (const bin of binaries) {
    try {
      const available = await new Promise<boolean>((resolve) => {
        const proc = spawn(bin, ["--version"], { env: getAugmentedEnv() });
        proc.on("error", () => resolve(false));
        proc.on("close", (code) => resolve(code === 0));
      });
      if (available) return bin;
    } catch {
      // Continue
    }
  }
  return null;
}

export async function compressPdf(
  options: CompressionOptions
): Promise<CompressionResult> {
  const { inputPath, targetSizeMB, onProgress } = options;
  const originalStats = fs.statSync(inputPath);
  const originalSizeBytes = originalStats.size;
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);
  const outputPath = options.outputPath || generateOutputPath(inputPath, "pdf");

  onProgress?.(10, "Checking PDF compression tools...");
  const gsBin = await isGhostscriptAvailable();

  if (gsBin) {
    onProgress?.(30, "Optimizing PDF with Ghostscript...");
    // Try ebook profile first (150 dpi), fallback to screen (72 dpi)
    const runGs = (profile: string) => {
      return new Promise<void>((resolve, reject) => {
        const gs = spawn(
          gsBin,
          [
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            `-dPDFSETTINGS=${profile}`,
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            `-sOutputFile=${outputPath}`,
            inputPath,
          ],
          { env: getAugmentedEnv() }
        );
        gs.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Ghostscript exited with code ${code}`));
        });
        gs.on("error", (err) => reject(err));
      });
    };

    await runGs("/ebook");

    let finalStats = fs.statSync(outputPath);
    if (finalStats.size > targetBytes) {
      onProgress?.(60, "Retrying with maximum compression (/screen)...");
      await runGs("/screen");
      finalStats = fs.statSync(outputPath);
    }

    const { ratioPercent } = calculateCompressionRatio(
      originalSizeBytes,
      finalStats.size
    );
    onProgress?.(100, "Done!");

    return {
      success: true,
      inputPath,
      outputPath,
      originalSizeBytes,
      compressedSizeBytes: finalStats.size,
      targetSizeBytes: targetBytes,
      compressionRatio: ratioPercent,
      details: "Compressed using Ghostscript engine",
    };
  } else {
    // Pure JS PDF optimization using pdf-lib
    onProgress?.(30, "Optimizing PDF streams...");
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes, {
      ignoreEncryption: true,
    });

    onProgress?.(70, "Writing optimized PDF...");
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    fs.writeFileSync(outputPath, pdfBytes);

    const finalStats = fs.statSync(outputPath);
    const { ratioPercent } = calculateCompressionRatio(
      originalSizeBytes,
      finalStats.size
    );
    onProgress?.(100, "Done!");

    return {
      success: true,
      inputPath,
      outputPath,
      originalSizeBytes,
      compressedSizeBytes: finalStats.size,
      targetSizeBytes: targetBytes,
      compressionRatio: ratioPercent,
      details: "Optimized with PDF stream compression",
    };
  }
}
