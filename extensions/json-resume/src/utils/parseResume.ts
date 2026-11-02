import { Resume } from "../types/resume";
import { validateResume } from "./validateResume";

export async function parseResumeJson(resumeJson: string): Promise<Resume> {
  let value: unknown;
  try {
    value = JSON.parse(resumeJson);
  } catch {
    throw new Error("Resume must be valid JSON.");
  }
  const result = await validateResume(value);
  if (value === null || typeof value !== "object" || Array.isArray(value) || !result.valid) {
    const details = result.error instanceof Error ? result.error.message : JSON.stringify(result.error);
    throw new Error(`Invalid JSON Resume: ${details ?? "Expected a JSON object"}`);
  }
  return value as Resume;
}
