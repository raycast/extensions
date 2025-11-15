import { encode } from "@toon-format/toon";
import * as yaml from "js-yaml";
import { EncodeResult } from "../types";
import { validateInput } from "./validation";

export function encodeToTOON(input: string, format: "json" | "yaml" | "auto" = "auto"): EncodeResult {
  // Validate input
  const validation = validateInput(input, format);
  if (!validation.valid) {
    return {
      toon: "",
      format: validation.detectedFormat || "json",
      original: input,
      success: false,
      error: validation.error,
    };
  }

  const detectedFormat = validation.detectedFormat!;

  try {
    // Parse input based on format
    let parsed: unknown;
    if (detectedFormat === "json") {
      parsed = JSON.parse(input);
    } else {
      parsed = yaml.load(input);
    }

    // Encode to TOON
    const toon = encode(parsed);

    return {
      toon,
      format: detectedFormat,
      original: input,
      success: true,
    };
  } catch (error) {
    return {
      toon: "",
      format: detectedFormat,
      original: input,
      success: false,
      error: error instanceof Error ? error.message : "Encoding failed",
    };
  }
}

export function calculateTokenSavings(original: string, toon: string): number {
  // Rough estimation: compare character counts
  // This is a simplified calculation
  const originalLength = original.length;
  const toonLength = toon.length;

  if (originalLength === 0) return 0;

  const savings = ((originalLength - toonLength) / originalLength) * 100;
  return Math.round(savings * 100) / 100; // Round to 2 decimal places
}
