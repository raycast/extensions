import fs from "node:fs/promises";
import path from "node:path";
import { captureException, environment } from "@raycast/api";
import { FILE_NAMES } from "../constants";
import { CaptureSchema } from "../schemas";
import type { Capture } from "../types";
import { ensureCapturesFileExists } from "../utils/captures";

/**
 * Retrieves all captures stored in Haystack for AI analysis.
 *
 * This tool provides the AI with access to the user's captured screenshots and their extracted data.
 * Each capture contains:
 * - A title (generated from title fields)
 * - The stack it belongs to (e.g., "Plane Tickets", "Concert Events")
 * - Extracted structured data with field names and values
 * - The date it was captured
 * - Path to the original screenshot
 *
 * Use this tool to:
 * - Answer questions about captured data (e.g., "What plane tickets do I have?")
 * - Search across captures (e.g., "Find all concerts in March")
 * - Summarize or aggregate information (e.g., "Total spending on tickets")
 * - Provide insights based on captured data
 *
 * @returns Array of capture objects with title, stack name, structured data, and metadata
 */
export default async function tool(): Promise<
  Array<{
    id: string;
    title: string;
    stack: {
      id: string;
      name: string;
      version: number;
    };
    data: Record<string, { value: string; type: string }>;
    createdAt: string;
    imagePath: string;
  }>
> {
  try {
    const captures = await readCaptures();

    return captures.map((capture) => ({
      id: capture.id,
      title: capture.title,
      stack: capture.stack,
      data: capture.data,
      createdAt: capture.createdAt,
      imagePath: capture.imagePath,
    }));
  } catch (error) {
    captureException(new Error("Failed to fetch captures for AI tool", { cause: error }));
    return [];
  }
}

async function readCaptures(): Promise<Capture[]> {
  const capturesPath = path.join(environment.supportPath, FILE_NAMES.CAPTURES_JSON);

  await ensureCapturesFileExists();

  try {
    const fileContent = await fs.readFile(capturesPath, "utf-8");
    const parsed = JSON.parse(fileContent);

    if (!Array.isArray(parsed)) {
      captureException(new Error("Captures file is not an array"));
      return [];
    }

    const validCaptures: Capture[] = [];

    for (const item of parsed) {
      try {
        const validated = CaptureSchema.parse(item);
        validCaptures.push(validated);
      } catch (error) {
        captureException(
          new Error(`Invalid capture data: ${JSON.stringify(item)}`, {
            cause: error,
          }),
        );
      }
    }

    return validCaptures;
  } catch (error) {
    captureException(new Error("Failed to read captures file", { cause: error }));
    return [];
  }
}
