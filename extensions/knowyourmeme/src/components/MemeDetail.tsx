import { Detail, ActionPanel } from "@raycast/api";
import { MemeDetails, getMeme } from "knowyourmeme-js";
import { useState, useEffect } from "react";
import { SearchResult } from "../types";
import { escapeHtmlAttr } from "../utils/helpers";
import { MemeDetailMetadata } from "./MemeDetailMetadata";
import {
  ActionCopyTemplateImage,
  ActionCopyThumbnail,
  ActionCopyUrl,
  ActionDownloadTemplateImage,
  ActionDownloadThumbnail,
  ActionOpenExtensionPreferences,
  ActionOpenInBrowser,
} from "./Actions";

export function MemeDetail({ searchResult }: { searchResult: SearchResult }) {
  const memeUrl = searchResult.url;
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MemeDetails | null>(null);

  const templateImageUrl =
    data?.sections
      .find((section) => section.title === "Template")
      ?.contents.find(
        (content) =>
          typeof content === "object" &&
          content.imageUrl &&
          (/^https:\/\/.*\.(png|jpe?g(_large)?|gif|webp|svg)$/.test(content.imageUrl) ||
            content.imageUrl.startsWith("https://i.kym-cdn.com/photos")),
      )?.imageUrl ?? "";

  useEffect(() => {
    if (!memeUrl) return;
    setIsLoading(true);
    (async () => {
      const result: MemeDetails | null = await getMeme(memeUrl);
      setData(result);
      setIsLoading(false);
    })();
  }, [memeUrl]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data?.title}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionOpenInBrowser searchResult={searchResult} />
            <ActionCopyThumbnail searchResult={searchResult} />
            <ActionDownloadThumbnail searchResult={searchResult} />
            <ActionCopyTemplateImage templateImageUrl={templateImageUrl} />
            <ActionDownloadTemplateImage templateImageUrl={templateImageUrl} />
            <ActionCopyUrl searchResult={searchResult} />
          </ActionPanel.Section>
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
      markdown={
        data
          ? `
# ${data?.title}

<img src="${data?.image.url}" alt="${escapeHtmlAttr(data?.image.alt)}" />

${data?.sections
  .map(
    (section) =>
      `## ${section.title}

${section.contents
  .map(
    (content) =>
      `${
        typeof content === "object" && content !== null
          ? typeof content.imageUrl === "string" &&
            (/^https:\/\/.*\.(png|jpe?g(_large)?|gif|webp|svg)$/.test(content.imageUrl) ||
              content.imageUrl.startsWith("https://i.kym-cdn.com/photos"))
            ? `<img src="${content.imageUrl}" alt="${escapeHtmlAttr(content.imageAlt)}" />

***
`
            : `(unsupported image) - ${content.imageAlt || "no alt text"}

***
`
          : content
      }

`,
  )
  .join("")}

`,
  )
  .join("")}
`
          : isLoading
            ? "## Loading..."
            : "# No data found"
      }
      metadata={data && <MemeDetailMetadata meme={data} />}
    />
  );
}
