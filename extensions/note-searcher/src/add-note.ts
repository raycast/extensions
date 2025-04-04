import { showToast, Toast } from "@raycast/api";
import {
  vectorIndex,
  extractURLs,
  generateEmbedding,
  generateId,
  detectNoteCategory,
  extractDataFromText,
  getUrlMetadata,
  NoteCategory,
  ScrapedUrlInfo,
} from "./utils";

interface Arguments {
  content: string;
}

export default async function Command(props: { arguments: Arguments }) {
  const { content } = props.arguments;

  try {
    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please provide some text or URL to add",
      });
      return;
    }

    // Check if input contains a URL
    const urls = extractURLs(content);
    const hasURL = urls.length > 0;

    // Text to store - either the original text or content from URL
    let textToStore = content;
    let urlMetadata: ScrapedUrlInfo | null = null;

    // If URL is found, try to get its metadata
    if (hasURL) {
      const url = urls[0]; // Use the first URL found
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching URL metadata",
        message: "Please wait...",
      });

      urlMetadata = await getUrlMetadata(url);

      if (urlMetadata) {
        // Successfully got metadata, enhance the note
        textToStore = `${urlMetadata.title} - ${urlMetadata.description}\n\nURL: ${url}`;

        await showToast({
          style: Toast.Style.Success,
          title: "URL metadata fetched",
          message: `From: ${urlMetadata.domain}`,
        });
      } else {
        // Failed to get metadata, just use the URL
        textToStore = url;

        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't fetch URL metadata",
          message: "Saving URL directly instead",
        });
      }
    }

    // Detect note category
    const noteCategory = urlMetadata ? NoteCategory.ARTICLE : detectNoteCategory(textToStore);

    // Extract important data
    const extractedData = extractDataFromText(textToStore);

    // Generate a vector embedding for the text
    const embedding = generateEmbedding(textToStore);

    // Generate a unique ID for the note
    const id = generateId();

    // Build metadata object
    const metadata: Record<string, unknown> = {
      text: textToStore,
      isUrl: hasURL,
      category: noteCategory,
      extractedData: JSON.stringify(extractedData),
      timestamp: new Date().toISOString(),
    };

    // Add URL metadata if available
    if (urlMetadata) {
      metadata.urlInfo = {
        title: urlMetadata.title,
        url: urlMetadata.url,
        domain: urlMetadata.domain,
        description: urlMetadata.description,
      };
    }

    // Store the note in Upstash Vector
    await vectorIndex.upsert([
      {
        id,
        vector: embedding,
        metadata,
      },
    ]);

    // Show success toast with category information
    await showToast({
      style: Toast.Style.Success,
      title: `Note added as ${noteCategory}`,
      message: hasURL
        ? urlMetadata
          ? "URL with metadata saved"
          : "URL saved successfully"
        : "Text saved successfully",
    });
  } catch (error) {
    // Show error toast
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Failed to add note: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
