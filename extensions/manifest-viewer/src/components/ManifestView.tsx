import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import fetch from "node-fetch";
import { ManifestParser } from "../utils/ManifestParser";
import { ManifestLineItem, ManifestType } from "../utils/types";
import { buildManifestLineItems } from "../utils/manifest";
import ManifestContentView from "./ManifestContentView";
import ManifestStructureView from "./ManifestStructureView";
import ErrorView from "./ErrorView";

interface ManifestViewProps {
  url: string;
  isRoot?: boolean;
}

export default function ManifestView({ url }: ManifestViewProps) {
  const { push } = useNavigation();
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [manifestType, setManifestType] = useState<ManifestType>("unknown");
  const [lineItems, setLineItems] = useState<ManifestLineItem[]>([]);

  useEffect(() => {
    loadContent();
  }, [url]);

  const loadContent = async () => {
    if (!url.trim()) {
      setError("No URL provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setHttpStatus(null);

      const response = await fetch(url);
      if (!response.ok) {
        setHttpStatus(response.status);
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const fetchedContent = await response.text();

      const parser = new ManifestParser(fetchedContent, url);
      const parsed = parser.parse();
      const finalType = parsed.type;

      setContent(fetchedContent);
      setManifestType(finalType);
      setLineItems(buildManifestLineItems(fetchedContent, url, finalType, parsed.allLinks));

      if (finalType === "unknown") {
        setError("The loaded resource is not a valid manifest file.");
      }
    } catch (error) {
      setError(`Failed to load content from: ${url}\n\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLink = (linkUrl: string) => {
    push(<ManifestView url={linkUrl} />);
  };

  const handleShowStructure = () => {
    if (!content) return;
    push(
      <ManifestStructureView
        isLoading={isLoading}
        lineItems={lineItems}
        onNavigate={navigateToLink}
        renderActions={renderStructureActions}
      />,
    );
  };

  const renderContentActions = (manifestType: ManifestType) => (
    <ActionPanel>
      {manifestType !== "webvtt" && (
        <Action key="structure" title="Open Navigation" icon={Icon.List} onAction={handleShowStructure} />
      )}
      <Action
        key="reload"
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "r" },
          Windows: { modifiers: ["ctrl"], key: "r" },
        }}
        onAction={loadContent}
      />
      <Action.OpenInBrowser key="browser" url={url} />
      <Action.CopyToClipboard key="copy-content" content={content} title="Copy Content" icon={Icon.Document} />
      <Action.CopyToClipboard key="copy-url" content={url} title="Copy URL" icon={Icon.Clipboard} />
    </ActionPanel>
  );

  const renderStructureActions = (extras: React.ReactElement[] = []) => <ActionPanel>{extras}</ActionPanel>;

  if (error) {
    return (
      <ErrorView
        message={error}
        url={url}
        httpStatus={httpStatus}
        manifestType={manifestType}
        onRetry={loadContent}
        actions={renderContentActions(manifestType)}
      />
    );
  }

  return (
    <ManifestContentView
      content={content}
      manifestType={manifestType}
      isLoading={isLoading}
      actions={renderContentActions(manifestType)}
    />
  );
}
