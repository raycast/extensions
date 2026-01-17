import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";

/**
 * User preferences for the extension.
 */
interface Preferences {
  /** The URL of the LM Studio server. */
  lmstudioUrl: string;
}

/**
 * Represents a model available in LM Studio.
 */
interface Model {
  /** Unique identifier for the model. */
  id: string;
  /** The object type (always "model"). */
  object: string;
  /** The owner or source of the model. */
  owned_by: string;
}

/**
 * Response from the LM Studio models endpoint.
 */
interface ModelsResponse {
  /** Array of available models. */
  data: Model[];
  /** The object type (always "list"). */
  object: string;
}

/**
 * A message in a chat conversation.
 */
interface ChatMessage {
  /** The role of the message sender. */
  role: "user" | "assistant" | "system";
  /** The content of the message, either text or an array of content parts. */
  content: string | ContentPart[];
}

/**
 * A part of a multimodal chat message content.
 */
interface ContentPart {
  /** The type of content part. */
  type: "text" | "image_url";
  /** Text content (when type is "text"). */
  text?: string;
  /** Image URL data (when type is "image_url"). */
  image_url?: {
    /** The data URL or HTTP URL of the image. */
    url: string;
  };
}

/**
 * Response from the LM Studio chat completions endpoint.
 */
interface ChatCompletionResponse {
  /** Unique identifier for the completion. */
  id: string;
  /** The object type. */
  object: string;
  /** Unix timestamp of when the completion was created. */
  created: number;
  /** The model used for the completion. */
  model: string;
  /** Array of completion choices. */
  choices: {
    /** Index of the choice in the array. */
    index: number;
    /** The generated message. */
    message: {
      /** The role of the message (always "assistant"). */
      role: string;
      /** The generated content. */
      content: string;
    };
    /** The reason the generation stopped. */
    finish_reason: string;
  }[];
  /** Error information if the request failed. */
  error?: {
    /** Human-readable error message. */
    message: string;
  };
}

/**
 * Gets the base URL for the LM Studio server from user preferences.
 * @returns The LM Studio server URL, defaults to "http://localhost:1234".
 */
function getBaseUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.lmstudioUrl || "http://localhost:1234";
}

/**
 * Checks if the LM Studio server is reachable.
 * @returns True if the server responds successfully, false otherwise.
 */
export async function checkServerConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${getBaseUrl()}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches the list of available models from LM Studio.
 * @returns Array of available models.
 * @throws Error if the request fails.
 */
export async function fetchModels(): Promise<Model[]> {
  const response = await fetch(`${getBaseUrl()}/v1/models`);

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data = (await response.json()) as ModelsResponse;
  return data.data;
}

/**
 * Gets the MIME type for an image file based on its extension.
 * @param filePath - The path to the image file.
 * @returns The MIME type string, defaults to "image/jpeg" for unknown extensions.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
  };
  return mimeTypes[ext] || "image/jpeg";
}

/**
 * Checks if a file is a supported image format.
 * @param filePath - The path to the file to check.
 * @returns True if the file has a supported image extension.
 */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tiff",
  ];
  return imageExtensions.includes(ext);
}

/**
 * Uses a vision model to generate a descriptive filename for an image.
 * @param imagePath - The path to the image file.
 * @param model - The model ID to use for image analysis.
 * @returns The suggested filename (without extension).
 * @throws Error if the API request fails or no name is returned.
 */
export async function getImageName(
  imagePath: string,
  model: string,
): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = getMimeType(imagePath);

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Look at this image and suggest a short, descriptive filename for it. Respond with ONLY the filename (no extension, no explanation, no quotes). Use lowercase words separated by underscores. Keep it under 50 characters. Example responses: sunset_over_mountains, black_cat_sleeping, coffee_cup_on_desk",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];

  const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 100,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;

  if (data.error) {
    throw new Error(`LM Studio error: ${data.error.message}`);
  }

  const suggestedName = data.choices?.[0]?.message?.content?.trim();

  if (!suggestedName) {
    throw new Error("No name suggestion returned");
  }

  return suggestedName;
}

/**
 * Sanitizes a string for use as a filename by removing invalid characters.
 * @param name - The raw filename string to sanitize.
 * @returns A sanitized filename string, max 100 characters.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100);
}

/**
 * Generates a unique filename by appending a counter if the file already exists.
 * @param dir - The directory path.
 * @param baseName - The base filename (without extension).
 * @param ext - The file extension (including the dot).
 * @returns A full path to a unique filename.
 */
export function getUniqueFilename(
  dir: string,
  baseName: string,
  ext: string,
): string {
  let candidate = path.join(dir, `${baseName}${ext}`);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName}_${counter}${ext}`);
    counter++;
  }

  return candidate;
}

/**
 * Result of an image rename operation.
 */
interface RenameResult {
  /** Whether the rename operation succeeded. */
  success: boolean;
  /** The original filename. */
  oldName: string;
  /** The new filename (if successful). */
  newName?: string;
  /** Error message (if failed or skipped). */
  error?: string;
}

/**
 * Renames an image file using AI-generated descriptive name.
 * @param imagePath - The path to the image file to rename.
 * @param model - The model ID to use for generating the name.
 * @returns The result of the rename operation.
 */
export async function renameImage(
  imagePath: string,
  model: string,
): Promise<RenameResult> {
  const oldName = path.basename(imagePath);
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath).toLowerCase();

  try {
    const suggestedName = await getImageName(imagePath, model);
    const cleanName = sanitizeFilename(suggestedName);

    if (!cleanName) {
      return { success: false, oldName, error: "Empty name returned" };
    }

    const newPath = getUniqueFilename(dir, cleanName, ext);
    const newName = path.basename(newPath);

    if (oldName === newName) {
      return { success: true, oldName, newName, error: "Name unchanged" };
    }

    fs.renameSync(imagePath, newPath);

    return { success: true, oldName, newName };
  } catch (error) {
    return {
      success: false,
      oldName,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
