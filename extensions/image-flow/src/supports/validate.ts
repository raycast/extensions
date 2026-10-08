import { Config, Input } from "../types";
import fs from "fs";
import { isImage } from "./image";

export function validateInputMustBeFilepath(input: Input): boolean {
  if (input.type === "filepath" && input.value !== "" && fs.existsSync(input.value)) {
    return true;
  }

  throw new Error(`input must be a valid file path: ${input.value}`);
}

export function validateInputMustBeImage(input: Input) {
  if (validateInputMustBeFilepath(input) && isImage(input.value)) {
    return true;
  }

  throw new Error(`input must be a valid image file path: ${input.value}`);
}

export function validateAndGetTinyPngApiKey(config: Record<string, Config>): string {
  const key = config?.["tinypng"]?.["apiKey"];
  if (!key) {
    throw new Error("TinyPNG API key is required but not configured");
  }

  return key as string;
}

export function validateAndGetConvertFormat(config: Config): string {
  const format = config?.["format"] as string;
  if (!format) {
    throw new Error(`[convert] action format is required but not configured`);
  }

  return format as string;
}
