import { environment } from "@raycast/api";
import { readFile, readdir } from "fs/promises";
import { createWriteStream } from "fs";
import { ErrnoException } from "../types";
import initFile from "../templates/init.json";

export async function getConfig(): Promise<string | ErrnoException | Error> {
  try {
    const configfilePath = `${environment.supportPath}/paper.json`;
    const paperDirectory = await readdir(environment.supportPath, { withFileTypes: true, recursive: true });

    if (paperDirectory.length === 0) {
      return new Promise((resolve, reject) => {
        const ws = createWriteStream(configfilePath);
        ws.write(JSON.stringify(initFile));
        ws.end();
        ws.on("finish", () => {
          readFile(configfilePath)
            .then((res) => resolve(res.toString("utf-8")))
            .catch((err) => reject(err));
        });
      });
    }

    const paper = await readFile(configfilePath);
    return paper.toString("utf-8");
  } catch (error: ErrnoException | Error | unknown) {
    return error as Error;
  }
}
