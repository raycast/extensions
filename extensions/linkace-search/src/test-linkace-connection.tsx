import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  formatProxySource,
  getReadableErrorMessage,
  isAbortError,
  normalizeBaseUrl,
  resolveProxyConfiguration,
  runConnectionTest,
} from "./linkace-api";

type TestState = {
  isLoading: boolean;
  markdown: string;
  diagnostics: string;
  statusLabel: string;
  statusIcon: string | Icon;
  statusText: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const normalizedBaseUrl = useMemo(() => normalizeBaseUrl(preferences.linkaceUrl), [preferences.linkaceUrl]);
  const preferredProxyUrl = preferences.proxyUrl?.trim();
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<TestState>({
    isLoading: true,
    markdown: "Running connection test…",
    diagnostics: "",
    statusLabel: "Running",
    statusIcon: Icon.Dot,
    statusText: "In progress",
  });

  useEffect(() => {
    const abortController = new AbortController();
    const searchUrl = `${normalizedBaseUrl}/api/v2/search/links?query=raycast`;

    async function testConnection() {
      setState({
        isLoading: true,
        markdown: "Running connection test…",
        diagnostics: "",
        statusLabel: "Running",
        statusIcon: Icon.Dot,
        statusText: "In progress",
      });

      const proxyConfiguration = await resolveProxyConfiguration(searchUrl, preferredProxyUrl);
      const resolvedProxyUrl = proxyConfiguration.proxyUrl;
      const proxySource = formatProxySource(proxyConfiguration.source);

      try {
        const result = await runConnectionTest({
          baseUrl: normalizedBaseUrl,
          apiKey: preferences.apiKey,
          proxyUrl: resolvedProxyUrl,
          signal: abortController.signal,
        });

        const markdown = [
          "# LinkAce Connection Test",
          "",
          "✅ Connection successful.",
          "",
          "## Checks",
          `- Base URL: ${normalizedBaseUrl}`,
          `- Proxy: ${resolvedProxyUrl ?? "None"}`,
          `- Proxy Source: ${proxySource}`,
          `- Search endpoint: OK (${result.searchResultCount} item(s) in sample response)`,
          `- Lists endpoint: OK (${result.listsResultCount} item(s) in sample response)`,
          `- Tags endpoint: OK (${result.tagsResultCount} item(s) in sample response)`,
          "",
          "## Request URLs",
          `- Search: ${result.searchUrl}`,
          `- Lists: ${result.listsUrl}`,
          `- Tags: ${result.tagsUrl}`,
        ].join("\n");

        const diagnostics = [
          `Base URL: ${normalizedBaseUrl}`,
          `Proxy: ${resolvedProxyUrl ?? "None"}`,
          `Proxy Source: ${proxySource}`,
          `Search URL: ${result.searchUrl}`,
          `Lists URL: ${result.listsUrl}`,
          `Tags URL: ${result.tagsUrl}`,
          `Sample search items: ${result.searchResultCount}`,
          `Sample lists items: ${result.listsResultCount}`,
          `Sample tags items: ${result.tagsResultCount}`,
        ].join("\n");

        setState({
          isLoading: false,
          markdown,
          diagnostics,
          statusLabel: "Success",
          statusIcon: Icon.CheckCircle,
          statusText: "Connection established",
        });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        const message = getReadableErrorMessage(error, resolvedProxyUrl);
        const markdown = [
          "# LinkAce Connection Test",
          "",
          "❌ Connection failed.",
          "",
          `**Error:** ${message}`,
          "",
          "## Configuration",
          `- Base URL: ${normalizedBaseUrl}`,
          `- Proxy: ${resolvedProxyUrl ?? "None"}`,
          `- Proxy Source: ${proxySource}`,
        ].join("\n");

        const diagnostics = [
          `Base URL: ${normalizedBaseUrl}`,
          `Proxy: ${resolvedProxyUrl ?? "None"}`,
          `Proxy Source: ${proxySource}`,
          `Error: ${message}`,
        ].join("\n");

        setState({
          isLoading: false,
          markdown,
          diagnostics,
          statusLabel: "Failed",
          statusIcon: Icon.ExclamationMark,
          statusText: message,
        });

        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Test Failed",
          message,
        });
      }
    }

    testConnection();

    return () => {
      abortController.abort();
    };
  }, [normalizedBaseUrl, preferences.apiKey, preferredProxyUrl, reloadToken]);

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={state.markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" icon={state.statusIcon} text={state.statusLabel} />
          <Detail.Metadata.Label title="Details" text={state.statusText} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Base URL" text={normalizedBaseUrl || "-"} />
          <Detail.Metadata.Label title="Configured Proxy" text={preferredProxyUrl || "Auto / None"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Run Test Again"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => setReloadToken((current) => current + 1)}
          />
          <Action.OpenInBrowser title="Open LinkAce" icon={Icon.Globe} url={normalizedBaseUrl} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => openExtensionPreferences()}
          />
          <Action.CopyToClipboard
            title="Copy Diagnostics"
            content={state.diagnostics}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
