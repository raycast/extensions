import fs from "fs";
import { FileWriteStatus } from "../types";

export const base64ToFile = (base64: string | null, outputPath: string | null): Promise<FileWriteStatus> => {
  return new Promise((resolve, reject) => {
    const base64Image = base64?.split?.(";base64,").pop();
    if (base64Image && outputPath) {
      fs.writeFile(outputPath, base64Image, { encoding: "base64" }, (err) => {
        if (err) {
          reject("failed");
        }
        resolve("success");
      });
    } else {
      reject("failed");
    }
  });
};
