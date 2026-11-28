import { useRef } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { clearOpenWrtCache } from "../lib/cache";
import { buildSafeCodeBlock, escapeMarkdownText } from "../lib/format";
import { fetchServiceLogs } from "../lib/openwrt";
import type { ExtensionPreferences } from "../lib/types";
import { getErrorDescription, normalizeRouterUrl } from "../lib/ubus";

interface RouterActionSectionProps {
  onRefresh?: () => void;
  showClearCache?: boolean;
  promotePreferences?: boolean;
  primaryRefresh?: boolean;
}

/** Shared refresh, LuCI web UI, cache clear, and extension preference actions across commands. */
export function RouterActionSection({
  onRefresh,
  showClearCache = true,
  promotePreferences = false,
  primaryRefresh = false,
}: RouterActionSectionProps) {
  let routerBaseUrl = "http://192.168.1.1";
  try {
    const prefs = getPreferenceValues<ExtensionPreferences>();
    routerBaseUrl = normalizeRouterUrl(prefs.routerUrl).baseUrl;
  } catch {
    // Fallback to default URL when preferences are malformed so preferences action remains reachable.
  }

  function handleClearCache() {
    clearOpenWrtCache();
    void showToast({
      style: Toast.Style.Success,
      title: "Cache Cleared",
      message: "Refreshing from router...",
    });
  }

  const preferencesAction = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );

  return (
    <ActionPanel.Section title="Router">
      {promotePreferences && preferencesAction}
      {onRefresh && (
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={primaryRefresh && !promotePreferences ? undefined : Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      )}
      <Action.OpenInBrowser
        title="Open Router Web UI"
        icon={Icon.Globe}
        url={routerBaseUrl}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      {showClearCache && <Action title="Clear Cached Data" icon={Icon.Trash} onAction={handleClearCache} />}
      {!promotePreferences && preferencesAction}
    </ActionPanel.Section>
  );
}

interface ServiceLogsDetailProps {
  serviceName: string;
}

/** Pushed detail view displaying recent syslog entries filtered by service name. */
export function ServiceLogsDetail({ serviceName }: ServiceLogsDetailProps) {
  const abortable = useRef<AbortController | undefined>(undefined);

  const {
    data: logs,
    error,
    isLoading,
    revalidate,
  } = usePromise(
    async (name: string) =>
      fetchServiceLogs(name, getPreferenceValues<ExtensionPreferences>(), abortable.current?.signal),
    [serviceName],
    {
      abortable,
      failureToastOptions: {
        title: "Failed to fetch service logs",
      },
    },
  );

  let markdown: string;
  if (error && !logs) {
    const info = getErrorDescription(error);
    markdown = `# ${info.title}\n\n${info.message}`;
  } else {
    markdown = [
      `# Logs: ${escapeMarkdownText(serviceName)}`,
      "",
      logs ? buildSafeCodeBlock(logs) : "_Loading syslog entries via logread..._",
    ].join("\n");
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Logs · ${serviceName}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {logs && (
            <ActionPanel.Section title="Logs">
              <Action.CopyToClipboard title="Copy Logs" content={logs} />
            </ActionPanel.Section>
          )}
          <RouterActionSection onRefresh={revalidate} showClearCache={false} />
        </ActionPanel>
      }
    />
  );
}
