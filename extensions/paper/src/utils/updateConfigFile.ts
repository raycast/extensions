import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { createWriteStream } from "fs";
import { ErrnoException, PaperRawData } from "../types";

export async function updateConfigFile(newPaperData: PaperRawData): Promise<string | ErrnoException | Error | unknown> {
  try {
    const configfilePath = `${environment.supportPath}/paper.json`;

    return new Promise((resolve, reject) => {
      const ws = createWriteStream(configfilePath);
      ws.write(JSON.stringify(newPaperData));
      ws.end();
      ws.on("finish", () => {
        readFile(configfilePath)
          .then((res) => resolve(res.toString("utf-8")))
          .catch((err) => reject(err));
      });
    });
  } catch (error: ErrnoException | Error | unknown) {
    return error;
  }
}
