import util from "util";
import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { showToast, Toast } from "@raycast/api";

export const execAsync = util.promisify(exec);
export const identifierFilePath = path.join(os.tmpdir(), "raycast-tts-identifier.txt");

export function parseSpeed(speed: string) {
  const speedValue = parseFloat(speed);
  if (speedValue < 0.25 || speedValue > 4) {
    throw new Error("Invalid speed value. Please enter a value between 0.25 and 4.");
  }
  return speedValue;
}

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
 * This function processes the input text to extract individual sentences. It first checks if the text length is less than or equal to the minimum sentence length, if so it returns the text as is.
 * If the text length is more than the minimum sentence length, it identifies sentence boundaries by looking for periods, exclamation marks, or question marks that are followed by a space or a newline character,
 * ensuring that these punctuation marks are not immediately preceded or followed by a digit to prevent incorrect splitting at decimal points or within dates.
 *
 * After identifying the sentence boundaries, the function trims each sentence to remove any leading or trailing whitespace. Sentences that are empty after trimming are discarded.
 *
 * Additionally, if a sentence exceeds the ideal length, it is further split into smaller segments at comma positions, provided that the commas are not immediately preceded or followed by a digit. This step helps to
 * maintain a manageable sentence length for subsequent processing.
 *
 * @param {string} text - The input text to be split into sentences.
 * @param {number} minSentenceLength - The minimum length of a sentence. Default is 50.
 * @param {number} idealLength - The ideal length of a sentence. Default is 80.
 * @returns {string[]} - An array of sentences derived from the input text, with each sentence trimmed and potentially split at comma positions to ensure shorter lengths.
 */
export function splitSentences(text: string, minSentenceLength: number = 80, idealLength: number = 120): string[] {
  if (text.length <= minSentenceLength) {
    return [text];
  }

  const sentenceEndRegex = /(?<=\D{10,})\.(?=\d)|(?<!\d)[.!?](?!\d)\s|\n/;
  const commaSplitRegex = /(?<!\d),(?!\d)\s*/;

  const sentences = text.split(sentenceEndRegex).map((s) => s.trim());

  return sentences.reduce<string[]>((acc, sentence) => {
    if (sentence.length <= idealLength) {
      acc.push(sentence);
    } else {
      const subParts = sentence.split(commaSplitRegex);
      let tempPart = "";

      subParts.forEach((part) => {
        if (tempPart.length + part.length < idealLength) {
          tempPart += part + ", ";
        } else {
          if (tempPart.length >= minSentenceLength) {
            acc.push(tempPart.trimEnd());
            tempPart = part + ", ";
          } else {
            tempPart += part + ", ";
          }
        }
      });

      if (tempPart) {
        acc.push(tempPart);
      }
    }
    return acc;
  }, []);
}

/**
 * Method to stop all afplay processes.
 */
export async function stopAllProcesses() {
  try {
    // Check for existing afplay processes
    const { stdout: pgrepStdout } = await execAsync("pgrep afplay");
    if (pgrepStdout) {
      // If afplay processes are found, kill them
      const { stdout, stderr } = await execAsync("pkill afplay");
      if (stderr) {
        console.error(`stderr from pkill: ${stderr}`);
      }
      console.log(`stdout from pkill: ${stdout}`);
    }
  } catch (error: unknown) {
    // Handle the case where no afplay processes are found
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Error in stopAllProcesses: ${(error as Error).message}`);
    }
  }
  // Attempting to clean up the temporary mp3 files
  await cleanupTmpDir();
}

export async function saveScriptToFile(script: string, currentIdentifier: string) {
  const scriptFilePath = path.resolve(os.tmpdir(), `converted_script_${currentIdentifier}.txt`);
  await fs.writeFile(scriptFilePath, script);
  return scriptFilePath;
}
