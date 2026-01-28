import { showInFinder } from "@raycast/api";
import * as fs from "fs";

/**
 * It takes a string, converts it to a number, and returns the number if it's a valid number, otherwise
 * it returns 0
 * @param {string} string - The string to convert to a number.
 * @returns A function that takes a string and returns a number.
 */
export function convertStringToNumber(string: string): number {
  const number: number = parseInt(string, 10);
  if (isNaN(number) || number < 0) {
    return 0;
  } else {
    return number;
  }
}

/**
 * It writes the given content to the given file, and then opens the file in the Finder
 * @param {string} content - The content of the file to be written.
 * @param {string} storagePath - The path to the storage directory.
 * @param {string} filename - The name of the file to be written.
 */
export async function writeFile(content: string, storagePath: string, filename: string): Promise<void> {
  const storageFile = storagePath + "/" + filename;
  const writer = fs.createWriteStream(storageFile, { encoding: "utf8" });
  writer.write(content);
  await waitForStreamClose(writer);
  await showInFinder(storageFile);
}

/**
 * It reads a file and returns its contents
 * @param {string} file - The file to read.
 * @returns The contents of the file.
 */
export function readFile(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

/**
 * It waits for a stream to close
 * @param stream - The stream to wait for.
 * @returns A promise that resolves when the stream has finished writing.
 */
async function waitForStreamClose(stream: fs.WriteStream): Promise<void> {
  stream.end();
  return new Promise((resolve) => {
    stream.once("finish", () => {
      resolve();
    });
  });
}
