import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import fs from "fs-extra";
import path from "path";
import { GOOGLE_GENERATIVE_AI_API_KEY } from "./config";
import fetch from "node-fetch";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = fetch as any;

// Helper to determine MIME type based on file extension
function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".tiff": "image/tiff",
    ".heic": "image/heic",
  };

  return mimeTypes[extension] || "image/jpeg";
}

const google = createGoogleGenerativeAI({
  apiKey: GOOGLE_GENERATIVE_AI_API_KEY,
});

// Define the response schema to include both filename and text content
const ImageAnalysisSchema = z.object({
  filename: z.string().describe("A short, descriptive filename in kebab-case format (1-3 words max)"),
  textContent: z.string().describe("All the visible text content from the image, exactly as it appears"),
});

// Function to analyze image and generate a name and extract text content
export async function analyzeImageAndSuggestName(imagePath: string): Promise<{
  filename: string;
  textContent: string;
}> {
  try {
    // Read image file
    const imageData = await fs.readFile(imagePath);
    const mimeType = getMimeType(imagePath);

    // Use generateObject to get a structured response
    const response = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: ImageAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image and provide: 1) A short, descriptive filename in kebab-case format (1-3 words max, no file extension), and 2) Extract all visible text content from the image, preserving the exact text as it appears.",
            },
            {
              type: "file",
              data: imageData,
              mimeType: mimeType,
            },
          ],
        },
      ],
    });

    console.log("API response:", JSON.stringify(response, null, 2));

    // Extract data from the response structure
    let suggestedName = "";
    let extractedText = "";

    if (response && typeof response === "object" && response.object) {
      if (response.object.filename) {
        suggestedName = response.object.filename.trim();
      }

      if (response.object.textContent) {
        extractedText = response.object.textContent.trim();
      }
    }

    if (!suggestedName) {
      console.log("Could not find filename in response structure, using fallback name");
      suggestedName = "ai-generated-image";
    }

    console.log("Extracted filename:", suggestedName);
    console.log("Extracted text content:", extractedText);

    // Sanitize the filename to ensure it only contains valid characters
    // Also enforce a maximum length to avoid filesystem errors
    const MAX_FILENAME_LENGTH = 64; // Set a reasonable max length

    let sanitizedName = suggestedName
      .replace(/[^a-z0-9-]/gi, "-") // Replace invalid characters with hyphens
      .replace(/-+/g, "-") // Replace multiple consecutive hyphens with a single one
      .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens

    // Truncate if too long
    if (sanitizedName.length > MAX_FILENAME_LENGTH) {
      sanitizedName = sanitizedName.substring(0, MAX_FILENAME_LENGTH);
      // Make sure we don't end with a hyphen after truncating
      sanitizedName = sanitizedName.replace(/-$/g, "");
    }

    console.log("Final sanitized name:", sanitizedName);

    // Use a fallback if we end up with an empty string after sanitization
    return {
      filename: sanitizedName || "ai-generated-image",
      textContent: extractedText || "No text content extracted",
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
