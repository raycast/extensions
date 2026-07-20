import { Detail, ActionPanel } from "@raycast/api";
import { MemeDetails, getMeme } from "knowyourmeme-js";
import { SearchResult } from "../types";
import { escapeHtmlAttr, isValidImageUrl } from "../utils/helpers";
import { MemeDetailMetadata } from "./MemeDetailMetadata";
import { useCachedPromise } from "@raycast/utils";
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

  const { data, isLoading } = useCachedPromise(
    async (url: string) => {
      const result: MemeDetails | null = await getMeme(url);
      return result;
    },
    [memeUrl],
    {
      execute: Boolean(memeUrl),
      keepPreviousData: false,
    },
  );

  const templateImageUrl =
    data?.sections
      .find((section) => section.title === "Template")
      ?.contents.find((content) => isValidImageUrl(content.imageUrl))?.imageUrl ?? "";

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
          ? isValidImageUrl(content.imageUrl)
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
