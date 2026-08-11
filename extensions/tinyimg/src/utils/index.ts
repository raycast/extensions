import fs from "fs/promises";
import { dirname, basename, join, extname } from "path";
import loadWasm from "./loadWasm";
import { optimize_apng_wasm } from "./apngopt-rs/apngopt_rs";

async function readFileToUint8Array(filePath: string) {
  try {
    // read file
    const buffer = await fs.readFile(filePath);

    // convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer);

    return uint8Array;
  } catch (error) {
    console.error("read file error:", error);
    throw error;
  }
}

interface CompressOption {
  overwrite?: boolean;
  quality?: string;
}

interface CompressResult {
  originalSize: number;
  compressedSize: number;
}

const preferences: CompressOption = {
  overwrite: false,
  quality: "70",
};

export async function compressImage(filePath: string, option: CompressOption): Promise<CompressResult> {
  option = { ...preferences, ...option };
  const input = await readFileToUint8Array(filePath);

  const outputDir = dirname(filePath);
  const ext = extname(filePath);
  let outputPath = join(outputDir, basename(filePath));
  if (outputPath === filePath && !option.overwrite) {
    outputPath = join(outputDir, `${basename(filePath, ext)}.compressed${ext}`);
  }

  if (isApng(input)) {
    try {
      // Parameters: input, z_method=0, iterations=15, disable_imagequant=0
      const compressedData = await optimize_apng_wasm(input, 0, 15, 0);
      await fs.writeFile(outputPath, compressedData);

      return {
        originalSize: input.length,
        compressedSize: compressedData.length,
      };
    } catch (error) {
      throw new Error(`APNG optimization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const wasmModule = await loadWasm();
  const inputPtr = wasmModule._malloc(input.length);
  wasmModule.HEAPU8.set(input, inputPtr);

  let resultPtr = 0;
  try {
    resultPtr = wasmModule._w_compress(inputPtr, input.length, parseInt(option.quality || "70"), true);
    const result = new Uint32Array(wasmModule.HEAPU8.buffer, resultPtr, 5);
    const status = result[0];
    const errorCode = result[1];
    const dataPtr = result[2];
    const dataLen = result[3];

    if (status === 1) {
      const compressedData = new Uint8Array(wasmModule.HEAPU8.buffer, dataPtr, dataLen);

      // create a Transferable Object
      const bufferCopy = new ArrayBuffer(compressedData.byteLength);
      const copyView = new Uint8Array(bufferCopy);
      copyView.set(compressedData);

      // Convert ArrayBuffer to Buffer and write to file
      const buffer = Buffer.from(bufferCopy);
      await fs.writeFile(outputPath, buffer);

      return {
        originalSize: input.length,
        compressedSize: buffer.length,
      };
    } else {
      throw new Error(`Compression failed with error code ${errorCode}`);
    }
  } finally {
    // free the memory
    wasmModule._free(inputPtr);
    if (resultPtr !== 0) {
      wasmModule._drop_vector_struct(resultPtr);
    }
  }
}

export function isApng(data: Uint8Array): boolean {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    data.length < 8 ||
    data[0] !== 0x89 ||
    data[1] !== 0x50 ||
    data[2] !== 0x4e ||
    data[3] !== 0x47 ||
    data[4] !== 0x0d ||
    data[5] !== 0x0a ||
    data[6] !== 0x1a ||
    data[7] !== 0x0a
  ) {
    return false;
  }

  const scanLimit = Math.min(data.length, 4096);
  const acTL = [0x61, 0x63, 0x54, 0x4c]; // "acTL" in ASCII

  for (let i = 8; i <= scanLimit - 4; i++) {
    if (data[i] === acTL[0] && data[i + 1] === acTL[1] && data[i + 2] === acTL[2] && data[i + 3] === acTL[3]) {
      return true;
    }
  }

  return false;
}

export function isSupportedImage(filePath: string) {
  const ext = extname(filePath).toLowerCase();
  return ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp" || ext === ".apng";
}
