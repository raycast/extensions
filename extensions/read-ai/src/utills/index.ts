import util from "util";
import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { showToast, Toast } from "@raycast/api";

export const execAsync = util.promisify(exec);
export const identifierFilePath = path.join(os.tmpdir(), "raycast-tts-identifier.txt");

export async function cleanupTmpDir() {
  const tmpdirPath = os.tmpdir();

  try {
    const files = await fs.readdir(tmpdirPath);
    const audioFiles = files.filter((file) => file.startsWith("speech_") && file.endsWith(".mp3"));
    console.log("🚀 ~ cleanupTmpDir audioFiles:", audioFiles);
    for (const file of audioFiles) {
      const filePath = path.resolve(tmpdirPath, file);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        throw new Error(`Failed to delete file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up temporary directory:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Cleanup Failed",
      message: "Failed to clean up temporary directory.",
    });
  }
}

/**
 * Sets the current command identifier.
 * @param {string} identifier - The identifier to be set.
 */

export async function setCurrentCommandIdentifier(identifier: string) {
  await fs.writeFile(identifierFilePath, identifier, "utf8");
}

/**
 * Gets the current command identifier.
 * @returns {string} - The current command identifier.
 */
export async function getCurrentCommandIdentifier() {
  try {
    return await fs.readFile(identifierFilePath, "utf8");
  } catch (error) {
    console.error("Error reading the current command identifier:", error);
    return null;
  }
}

/**
 * Splits the input text into sentences.
 * @description
 * The function first splits the text by period, exclamation mark, or question mark followed by a space
 * or a newline character, but not preceded or followed by a digit (to avoid splitting at decimal points or dates).
 * Each sentence is then trimmed of whitespace, and only non-empty sentences are kept.
 *
 * For sentences that are longer than 100 characters, the function further splits the sentence by commas.
 * This is done to ensure that the resulting sentences are not too long.
 *
 * @param {string} text - The input text to be split into sentences.
 * @returns {string[]} - An array of sentences obtained from the input text.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=\D{10,})\.(?=\d)|(?<!\d)[.!?](?!\d)\s|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .flatMap((sentence) => {
      // Split by comma for sentences that are longer than 100 characters.
      return sentence.length > 100 ? sentence.split(/(?<!\d),(?!\d)\s*/) : [sentence];
    });
}
