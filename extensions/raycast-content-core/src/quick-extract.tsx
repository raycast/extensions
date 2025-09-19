import {
  LaunchProps,
  Clipboard,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import {
  extractContent,
  checkUvxAvailable,
  isValidUrl,
  validateFile,
  isSupportedFile,
} from "./utils/content-core";

interface Arguments {
  source: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { source } = props.arguments;

  try {
    // Validate input
    if (!source.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Source Required",
        message: "Please provide a URL or file path to extract content from",
      });
      return;
    }

    // Auto-detect source type
    let sourceType: "url" | "file";
    if (isValidUrl(source)) {
      sourceType = "url";
    } else if (validateFile(source).valid && isSupportedFile(source)) {
      sourceType = "file";
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Source",
        message: "Please provide a valid URL or file path",
      });
      return;
    }

    // Additional validation
    if (sourceType === "file") {
      const validation = validateFile(source);
      if (!validation.valid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "File Error",
          message: validation.error || "File validation failed",
        });
        return;
      }

      if (!isSupportedFile(source)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unsupported File Type",
          message: "File type not supported by Content Core",
        });
        return;
      }
    }

    // Check if uvx is available
    if (!checkUvxAvailable()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "uvx not found",
        message:
          "Please install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh",
      });
      return;
    }

    // Show processing toast
    const displayName = source.split("/").pop() || source;
    const typeDisplay = sourceType === "url" ? "URL" : "file";

    await showToast({
      style: Toast.Style.Animated,
      title: "Extracting content...",
      message: `Processing ${typeDisplay}: ${displayName}`,
    });

    // Close main window to get out of the way
    await closeMainWindow();

    // Extract content
    const result = await extractContent({
      source,
      sourceType,
      format: "text",
    });

    if (result.success) {
      // Copy to clipboard
      await Clipboard.copy(result.content);

      await showToast({
        style: Toast.Style.Success,
        title: "Content extracted!",
        message: `Copied ${result.metadata?.contentLength?.toLocaleString()} characters from ${typeDisplay} to clipboard`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Extraction failed",
        message: result.error || "Unknown error occurred",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
