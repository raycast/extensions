import { Tool } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { parseResumeJson } from "../utils/parseResume";

export interface TextToResumeInput {
  /**
   * Extract the user's text into a JSON Resume object or section fragment and pass it
   * as a JSON string. Use basics.url, work.name/work.url, and education.score.
   * Copy GPA verbatim into education[].score as a string, including its scale
   * (for example, "3.7/4.0"). Never use gpa. Put honors in education[].summary.
   * Omit unknown dates entirely instead of passing empty strings.
   * Keep complete supplied project descriptions, including metrics, and put supplied
   * technologies in projects[].keywords. Do not infer missing technologies.
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
  const resume = await parseResumeJson(input.resumeJson);
  const formattedJson = JSON.stringify(resume, null, 2);
  if (input.outputPath) {
    await fs.writeFile(path.resolve(input.outputPath), formattedJson, { encoding: "utf-8", flag: "wx" });
  }
  return formattedJson;
}
