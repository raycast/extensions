// Polyfill for fetch API in Node.js environment
import nodeFetch from "node-fetch";
// @ts-expect-error - Polyfill for fetch in Node.js
global.fetch = nodeFetch;

import fs from "fs/promises";
import path from "path";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Preferences {
  geminiApiKey: string;
  batchSize: string;
}

// Get user preferences
const preferences = getPreferenceValues<Preferences>();

// Initialize Gemini client
const geminiAI = preferences.geminiApiKey ? new GoogleGenerativeAI(preferences.geminiApiKey) : null;

interface RenameResult {
  originalPath: string;
  newPath: string;
  success: boolean;
  error?: string;
}

export async function renameScreenshots(filePaths: string[]): Promise<RenameResult[]> {
  // Process files in parallel with a concurrency limit based on user preferences
  const concurrencyLimit = Math.max(1, Number(preferences.batchSize || "3")); // Default to 3 if not set, ensure minimum of 1
  const batchResults = [];

  // Process files in batches
  for (let i = 0; i < filePaths.length; i += concurrencyLimit) {
    const batch = filePaths.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map((filePath) => renameScreenshot(filePath));
    batchResults.push(...(await Promise.all(batchPromises)));
  }

  return batchResults;
}

async function renameScreenshot(filePath: string): Promise<RenameResult> {
  try {
    // Generate a descriptive name for the screenshot
    const newFileName = await generateScreenshotName(filePath);

    // Create the new file path with the generated name
    const directory = path.dirname(filePath);
    const extension = path.extname(filePath);
    const newFilePath = path.join(directory, `${newFileName}${extension}`);

    try {
      await fs.rename(filePath, newFilePath);
      return {
        originalPath: filePath,
        newPath: newFilePath,
        success: true,
      };
    } catch (error) {
      // If file exists, add timestamp and retry
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
        const timestamp = Date.now();
        const newUniqueFilePath = path.join(directory, `${newFileName}_${timestamp}${extension}`);
        await fs.rename(filePath, newUniqueFilePath);
        return {
          originalPath: filePath,
          newPath: newUniqueFilePath,
          success: true,
        };
      }
      throw error; // Re-throw other errors
      return {
        originalPath: filePath,
        newPath: newFilePath,
        success: true,
      };
    }
  } catch (error) {
    console.error(`Error renaming ${filePath}:`, error);
    return {
      originalPath: filePath,
      newPath: filePath,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function generateScreenshotName(filePath: string): Promise<string> {
  // Validate that we have a Gemini API key
  if (!geminiAI) {
    throw new Error("Google Gemini API key is missing or invalid");
  }

  try {
    // Read the image file
    const imageBuffer = await fs.readFile(filePath);

    // Generate name using Gemini
    return await generateNameWithGemini(imageBuffer, filePath);
  } catch (error) {
    console.error("Error generating screenshot name:", error);

    // Enhanced error handling with specific messages for common errors
    if (error instanceof Error) {
      console.error("Error details:", error.message);

      // Check for rate limit errors or quota issues
      if (
        error.message.includes("429") ||
        error.message.includes("exceeded") ||
        error.message.includes("quota") ||
        error.message.includes("rate limit")
      ) {
        // Show toast notification
        await showToast({
          style: Toast.Style.Failure,
          title: "Google Gemini API Rate Limit Exceeded",
          message: "Check your API usage and try again later.",
        });
      } else {
        // For other errors
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Generating Filename",
          message: error.message,
        });
      }
    }

    // For all errors, use a simple timestamp
    return `screenshot_${Date.now()}`;
  }
}

// Function to generate name using Google Gemini
async function generateNameWithGemini(imageBuffer: Buffer, filePath: string): Promise<string> {
  if (!geminiAI) {
    throw new Error("Gemini client not initialized");
  }

  // Get Gemini model (using the latest flash model since pro-vision is deprecated)
  const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Convert buffer to base64 for Gemini API
  const base64Image = imageBuffer.toString("base64");

  // Create prompt for Gemini
  const prompt =
    "Create a concise, descriptive filename for this screenshot. Use lowercase, separate words with underscores, and be specific about what's shown. Focus on content (charts, UI elements, pages, etc). Return only the filename without extension.";

  // Call Gemini API
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: `image/${getImageMimeType(filePath)}`,
        data: base64Image,
      },
    },
  ]);

  // Extract response text
  const response = await result.response;
  const description = response.text().trim().toLowerCase() || "screenshot";

  // Process the description into a valid filename
  return processDescription(description);
}

// Helper to determine mime type from file extension
function getImageMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "jpeg";
    case ".png":
      return "png";
    case ".gif":
      return "gif";
    case ".webp":
      return "webp";
    default:
      return "png"; // Default to png
  }
}

// Process the AI-generated description into a valid filename
function processDescription(description: string): string {
  // Replace spaces with underscores and remove any special characters except underscores
  let processed = description
    .replace(/[^a-z0-9_]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_"); // Replace multiple underscores with single underscore

  // Add a timestamp if the description is too short or generic
  if (processed.length < 3 || processed === "screenshot") {
    processed = `screenshot_${Date.now()}`;
  }

  return processed;
}
