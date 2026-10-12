import { Tool } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { validateResume } from "../utils/validateResume";

export interface TextToResumeInput {
  /**
   * Extract the user's text into a JSON Resume object or section fragment and pass it
   * as a JSON string. Use basics.url, work.name/work.url, and education.score.
   * Include only supplied facts; preserve year or year-month date precision and omit
   * unknown dates. Do not invent dates, employers, qualifications, or accomplishments.
   */
  resumeJson: string;
  /** Optional file path, only when the user explicitly requests saving a file. Existing files are never overwritten. */
  outputPath?: string;
}

export const confirmation: Tool.Confirmation<TextToResumeInput> = async (input) => {
  if (!input.outputPath) return;
  return {
    message: "Save the validated JSON Resume to a new file? Existing files will not be overwritten.",
    info: [{ name: "Output Path", value: path.resolve(input.outputPath) }],
  };
};

/** Validate the calling model's extraction without another model call or clipboard mutation. */
export default async function textToResume(input: TextToResumeInput): Promise<string> {
  let resume: unknown;
  try {
    resume = JSON.parse(input.resumeJson);
  } catch {
    throw new Error("resumeJson must be a JSON object encoded as a JSON string.");
  }
  if (resume === null || typeof resume !== "object" || Array.isArray(resume)) {
    throw new Error("resumeJson must encode a JSON Resume object, not a primitive or array.");
  }
  const result = await validateResume(resume);
  if (!result.valid) {
    throw new Error(`Invalid JSON Resume: ${String(result.error)}. Correct the fields and retry.`);
  }
  const formattedJson = JSON.stringify(resume, null, 2);
  if (input.outputPath) {
    await fs.writeFile(path.resolve(input.outputPath), formattedJson, { encoding: "utf-8", flag: "wx" });
  }
  return formattedJson;
}
