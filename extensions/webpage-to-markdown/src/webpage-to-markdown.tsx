import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { Arguments, Metadata, Preferences } from "./types";
import { fetchJinaMarkdown } from "./services/jina-service";
import { processMarkdownContent } from "./utils/markdown-utils";
import { MetadataSection } from "./components/MetadataSection";
import { addFrontMatter } from "./utils/get-prefs";

export default function Command(props: { arguments: Arguments }) {
  const [markdown, setMarkdown] = useState<string>("Loading markdown...");
  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<Metadata>({});
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchMarkdown() {
      try {
        setMarkdown("# Converting webpage to Markdown...\n\n> Loading content from: " + props.arguments.url);

        const response = await fetchJinaMarkdown(props.arguments.url, preferences);
        const { markdown: processedMarkdown, metadata: newMetadata } = processMarkdownContent(
          response.data.content,
          response.data.title,
          response.data.links,
          preferences.includeLinksSummary,
        );

        setMetadata(newMetadata);

        let finalMarkdown = processedMarkdown;
        if (preferences.prependFrontMatter) {
          finalMarkdown = addFrontMatter(processedMarkdown, {
            title: response.data.title,
            sourceUrl: props.arguments.url,
            wordCount: newMetadata.wordCount || 0,
            readingTime: newMetadata.readingTime || "",
          });
        }

        setMarkdown(finalMarkdown);
      } catch (error) {
        console.error("Error converting URL:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setMarkdown(
          [
            "# Unable to Convert Webpage",
            "",
            errorMessage,
            "",
            "Please make sure:",
            "- The URL starts with http:// or https://",
            "- The webpage is publicly accessible",
            "- The URL points to a valid webpage",
          ].join("\n"),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarkdown();
  }, [props.arguments.url, preferences.prependFrontMatter, preferences.includeLinksSummary]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={metadata.title || "Converting..."}
      metadata={
        preferences.includeMetadata ? <MetadataSection url={props.arguments.url} metadata={metadata} /> : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Markdown" content={markdown} icon={Icon.Clipboard} />
            <Action.OpenInBrowser title="Open Original URL" url={props.arguments.url} icon={Icon.Globe} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
