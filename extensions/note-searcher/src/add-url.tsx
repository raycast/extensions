import { Form, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";
import {
  vectorIndex,
  generateEmbedding,
  generateId,
  getUrlMetadata,
  NoteCategory,
  extractDataFromText,
  ScrapedUrlInfo,
} from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [urlInfo, setUrlInfo] = useState<ScrapedUrlInfo | null>(null);

  async function fetchUrlMetadata(url: string) {
    setIsLoading(true);
    try {
      const metadata = await getUrlMetadata(url);
      if (metadata) {
        setUrlInfo(metadata);
        await showToast({
          style: Toast.Style.Success,
          title: "URL metadata fetched",
          message: `Found: ${metadata.title}`,
        });
      } else {
        setUrlInfo(null);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch URL metadata",
          message: "Please check if the URL is valid",
        });
      }
    } catch (error) {
      console.error("Error fetching URL metadata:", error);
      setUrlInfo(null);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error fetching URL metadata",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: { url: string; title: string; description: string; manual: boolean }) {
    try {
      setIsLoading(true);

      // If not using manual values, fetch metadata
      if (!values.manual && !urlInfo) {
        await fetchUrlMetadata(values.url);
        // Return early, let the user confirm after fetching
        setIsLoading(false);
        return;
      }

      // Determine final values to use
      const finalTitle = values.manual ? values.title : urlInfo?.title || values.title;
      const finalDescription = values.manual ? values.description : urlInfo?.description || values.description;

      // Create content to store
      const content = `${finalTitle} - ${finalDescription}\n\nURL: ${values.url}`;

      // Extract data from content
      const extractedData = extractDataFromText(content);

      // Generate vector embedding
      const embedding = generateEmbedding(content);

      // Generate ID
      const id = generateId();

      // Domain information
      let domain = "";
      try {
        const urlObj = new URL(values.url);
        domain = urlObj.hostname.replace(/^www\./, "");
      } catch {
        domain = "Unknown Domain";
      }

      // Store the note in Upstash Vector
      await vectorIndex.upsert([
        {
          id,
          vector: embedding,
          metadata: {
            text: content,
            isUrl: true,
            category: NoteCategory.ARTICLE,
            extractedData: JSON.stringify(extractedData),
            timestamp: new Date().toISOString(),
            urlInfo: {
              title: finalTitle,
              url: values.url,
              domain: domain,
              description: finalDescription,
            },
          },
        },
      ]);

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "URL saved successfully",
        message: finalTitle,
      });

      // Reset form by clearing urlInfo
      setUrlInfo(null);
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error saving URL",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save URL" onSubmit={handleSubmit} icon={Icon.SaveDocument} />
          <Action
            title="Fetch Metadata"
            icon={{ source: Icon.Download, tintColor: Color.Blue }}
            onAction={async () => {
              const url = (document.getElementById("url") as HTMLInputElement)?.value || "";
              if (url) {
                await fetchUrlMetadata(url);
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "URL is required",
                  message: "Please enter a URL first",
                });
              }
            }}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="url" title="URL" placeholder="https://example.com" info="Enter the URL to add" autoFocus />

      <Form.Separator />

      <Form.Checkbox id="manual" label="Edit Metadata Manually" info="Enable to manually edit title and description" />

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter title or fetch from URL"
        info="Title for the URL"
        value={urlInfo?.title}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter description or fetch from URL"
        info="Description for the URL"
        value={urlInfo?.description}
      />

      {urlInfo && (
        <Form.Description
          title="Metadata Preview"
          text={`URL: ${urlInfo.url}\nDomain: ${urlInfo.domain}\nTitle: ${urlInfo.title}\nDescription: ${urlInfo.description}`}
        />
      )}
    </Form>
  );
}
