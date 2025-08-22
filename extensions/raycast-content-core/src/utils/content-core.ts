import { execSync } from "child_process";
import { existsSync } from "fs";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ContentResult, ProcessingOptions, ApiPreferences } from "./types";

/**
 * Get the path to uvx executable
 */
function getUvxPath(): string | null {
  const paths = [
    "/opt/homebrew/bin/uvx",
    "/usr/local/bin/uvx",
    "/Users/" + process.env.USER + "/.cargo/bin/uvx",
    "/Users/" + process.env.USER + "/.local/bin/uvx",
  ];

  // First try with full PATH
  try {
    const result = execSync("which uvx", {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH:
          "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin:/Users/" +
          process.env.USER +
          "/.cargo/bin:/Users/" +
          process.env.USER +
          "/.local/bin:" +
          (process.env.PATH || ""),
      },
    });
    return result.trim();
  } catch {
    // Try direct paths
    for (const path of paths) {
      try {
        execSync(path + " --version", { stdio: "ignore" });
        return path;
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Check if uvx is available on the system
 */
export function checkUvxAvailable(): boolean {
  return getUvxPath() !== null;
}

/**
 * Setup environment variables from Raycast preferences
 */
function setupEnvironment(): Record<string, string> {
  const preferences = getPreferenceValues<ApiPreferences>();
  const env: Record<string, string> = {
    ...process.env,
    PATH:
      "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin:/Users/" +
      process.env.USER +
      "/.cargo/bin:/Users/" +
      process.env.USER +
      "/.local/bin:" +
      (process.env.PATH || ""),
  };

  if (preferences.openaiApiKey) {
    env.OPENAI_API_KEY = preferences.openaiApiKey;
  }
  if (preferences.firecrawlApiKey) {
    env.FIRECRAWL_API_KEY = preferences.firecrawlApiKey;
  }
  if (preferences.jinaApiKey) {
    env.JINA_API_KEY = preferences.jinaApiKey;
  }

  return env;
}

/**
 * Validate URL format
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate file exists and is accessible
 */
export function validateFile(filePath: string): {
  valid: boolean;
  error?: string;
} {
  if (!filePath.trim()) {
    return { valid: false, error: "File path is required" };
  }

  if (!existsSync(filePath)) {
    return { valid: false, error: "File does not exist" };
  }

  return { valid: true };
}

/**
 * Extract content using Content Core
 */
export async function extractContent(
  options: ProcessingOptions,
): Promise<ContentResult> {
  const { source, sourceType } = options;

  // Validate input
  if (sourceType === "url" && !isValidUrl(source)) {
    return {
      success: false,
      content: "",
      error: "Invalid URL format",
    };
  }

  if (sourceType === "file") {
    const validation = validateFile(source);
    if (!validation.valid) {
      return {
        success: false,
        content: "",
        error: validation.error,
      };
    }
  }

  try {
    const env = setupEnvironment();
    const uvxPath = getUvxPath();

    if (!uvxPath) {
      throw new Error(
        "uvx not found. Please install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh",
      );
    }

    //const formatFlag = format !== "text" ? ["--format", format] : [];
    // const args = ["--from", "content-core", "ccore", source, ...formatFlag];
    const command = uvxPath;

    await showToast({
      style: Toast.Style.Animated,
      title: "Extracting content...",
      message: `Processing ${sourceType}: ${source.split("/").pop() || source}`,
    });

    const startTime = Date.now();
    const output = execSync(command, {
      encoding: "utf8",
      env,
      timeout: 120000, // 2 minute timeout
    });

    const extractionTime = (Date.now() - startTime) / 1000;

    await showToast({
      style: Toast.Style.Success,
      title: "Content extracted successfully",
      message: `Processed in ${extractionTime.toFixed(1)}s`,
    });

    return {
      success: true,
      content: output.trim(),
      metadata: {
        source,
        sourceType,
        extractionTime,
        contentLength: output.length,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await showToast({
      style: Toast.Style.Failure,
      title: "Extraction failed",
      message: errorMessage,
    });

    return {
      success: false,
      content: "",
      error: errorMessage,
      metadata: {
        source,
        sourceType,
      },
    };
  }
}

/**
 * Summarize content using Content Core
 */
export async function summarizeContent(
  options: ProcessingOptions,
): Promise<ContentResult> {
  const { source, sourceType, context } = options;

  // Validate input
  if (sourceType === "url" && !isValidUrl(source)) {
    return {
      success: false,
      content: "",
      error: "Invalid URL format",
    };
  }

  if (sourceType === "file") {
    const validation = validateFile(source);
    if (!validation.valid) {
      return {
        success: false,
        content: "",
        error: validation.error,
      };
    }
  }

  try {
    const env = setupEnvironment();
    const uvxPath = getUvxPath();

    if (!uvxPath) {
      throw new Error(
        "uvx not found. Please install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh",
      );
    }

    const contextFlag = context ? ` --context "${context}"` : "";
    const command = `"${uvxPath}" --from "content-core" csum "${source}"${contextFlag}`;

    await showToast({
      style: Toast.Style.Animated,
      title: "Generating summary...",
      message: `Processing ${sourceType}: ${source.split("/").pop() || source}`,
    });

    const startTime = Date.now();
    const output = execSync(command, {
      encoding: "utf8",
      env,
      timeout: 120000, // 2 minute timeout
    });

    const extractionTime = (Date.now() - startTime) / 1000;

    await showToast({
      style: Toast.Style.Success,
      title: "Summary generated successfully",
      message: `Processed in ${extractionTime.toFixed(1)}s`,
    });

    return {
      success: true,
      content: output.trim(),
      metadata: {
        source,
        sourceType,
        extractionTime,
        contentLength: output.length,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await showToast({
      style: Toast.Style.Failure,
      title: "Summarization failed",
      message: errorMessage,
    });

    return {
      success: false,
      content: "",
      error: errorMessage,
      metadata: {
        source,
        sourceType,
      },
    };
  }
}

/**
 * Get supported file extensions for Content Core
 */
export function getSupportedExtensions(): string[] {
  return [
    // Documents
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".txt",
    ".md",
    ".csv",
    ".html",
    ".epub",

    // Media
    ".mp4",
    ".avi",
    ".mov",
    ".mkv",
    ".mp3",
    ".wav",
    ".m4a",
    ".flac",

    // Images
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".bmp",
    ".webp",

    // Archives
    ".zip",
    ".tar",
    ".gz",
  ];
}

/**
 * Check if file extension is supported
 */
export function isSupportedFile(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  return ext ? getSupportedExtensions().includes("." + ext) : false;
}
