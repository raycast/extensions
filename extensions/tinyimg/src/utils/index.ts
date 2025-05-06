import fs from "fs/promises";
import { createWriteStream } from "fs";
import { dirname, basename, join, extname } from "path";
import loadWasm from "./loadWasm";

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
  return new Promise((resolve, reject) => {
    loadWasm()
      .then((wasmModule) => {
        readFileToUint8Array(filePath)
          .then((input) => {
            const inputPtr = wasmModule._malloc(input.length);
            wasmModule.HEAPU8.set(input, inputPtr);
            const resultPtr = wasmModule._w_compress(inputPtr, input.length, parseInt(option.quality || "70"), true);
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

              // Save compressed image
              const outputDir = dirname(filePath);

              let outputPath = join(outputDir, basename(filePath));
              if (outputPath === filePath && !option.overwrite) {
                const ext = extname(filePath);
                outputPath = join(outputDir, `${basename(filePath, ext)}.compressed${ext}`);
              }

              const outputFileStream = createWriteStream(outputPath);

              // Convert ArrayBuffer to Buffer and write to file
              const buffer = Buffer.from(bufferCopy);
              outputFileStream.write(buffer);
              outputFileStream.end();

              resolve({
                originalSize: input.length,
                compressedSize: buffer.length,
              });
            } else {
              reject(new Error(`Compression failed with error code ${errorCode}`));
            }

            // free the memory
            wasmModule._free(inputPtr);
            wasmModule._drop_vector_struct(resultPtr);
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export function isSupportedImage(filePath: string) {
  const ext = extname(filePath).toLowerCase();
  return ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp";
}
