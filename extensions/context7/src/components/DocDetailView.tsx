/**
 * Documentation Detail View Component
 * Displays full documentation content for a selected library
 */

import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  openExtensionPreferences,
  Icon,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { getDocs, getLlmsTxt } from "../lib/api";
import { LibrarySearchResult, APIError, Preferences } from "../lib/types";

interface DocDetailViewProps {
  library: LibrarySearchResult;
}

export function DocDetailView({ library }: DocDetailViewProps) {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<APIError | undefined>(undefined);

  const [, setIsLoadingLlms] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  // Fetch documentation on mount
  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const docs = await getDocs(library.id);

        if (!cancelled) {
          setMarkdown(docs);

          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const apiError = err as APIError;
          setError(apiError);
          setIsLoading(false);

          // Show error toast
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load documentation",
            message: apiError.message,
            primaryAction: apiError.showPreferencesLink
              ? {
                  title: "Open Preferences",
                  onAction: () => openExtensionPreferences(),
                }
              : undefined,
          });
        }
      }
    };

    fetchDocs();

    return () => {
      cancelled = true;
    };
  }, [library.id]);

  // Construct Context7 URL for the library
  const context7Url = `https://context7.com${library.id}`;

  // Get llms.txt URL with configured tokens
  const tokenLimit = parseInt(preferences.defaultTokens || "10000", 10);
  const llmsTxtUrl = `https://context7.com${library.id}/llms.txt?tokens=${tokenLimit}`;

  // Handle copying llms.txt content
  const handleCopyLlmsTxt = async () => {
    setIsLoadingLlms(true);
    try {
      const content = await getLlmsTxt(library.id);
      await Clipboard.copy(content);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: "llms.txt content copied successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingLlms(false);
    }
  };

  // Show error state if fetch failed
  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Documentation\n\n${error.message}`}
        actions={
          <ActionPanel>
            {error.showPreferencesLink && (
              <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            )}
            <Action.OpenInBrowser title="View on Context7" url={context7Url} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={library.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Library" text={library.title} />
          <Detail.Metadata.Label title="Description" text={library.description} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Stars"
            text={library.stars >= 0 ? library.stars.toLocaleString() : "N/A"}
            icon={Icon.Star}
          />
          <Detail.Metadata.Label title="Trust Score" text={library.trustScore.toFixed(1)} icon={Icon.CheckCircle} />
          <Detail.Metadata.Label
            title="Total Snippets"
            text={library.totalSnippets.toLocaleString()}
            icon={Icon.Code}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Branch" text={library.branch} />
          <Detail.Metadata.Label title="Last Updated" text={new Date(library.lastUpdateDate).toLocaleDateString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={markdown} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.OpenInBrowser title="Open in Browser" url={context7Url} />
          <Action.OpenInBrowser
            title="Open Llms.txt Link"
            url={llmsTxtUrl}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action
            title="Copy Llms.txt Content"
            icon={Icon.Clipboard}
            onAction={handleCopyLlmsTxt}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={context7Url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        </ActionPanel>
      }
    />
  );
}
