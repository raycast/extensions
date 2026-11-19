import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { FrihetApiError } from "./lib/frihet-client.js";
import {
  clearActiveWorkspaceCache,
  createClientFromPreferences,
} from "./lib/runtime-client.js";
import { globalTenantCache } from "./lib/tenant-cache.js";
import type { BusinessContext } from "./lib/types.js";

export default function SwitchWorkspaceCommand() {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [tenantHash, setTenantHash] = useState<string>("unauthenticated");
  const [baseUrl, setBaseUrl] = useState<string>("https://api.frihet.io/v1");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FrihetApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadWorkspaceStatus = useCallback(async (bypassCache = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const api = createClientFromPreferences();
      setTenantHash(api.tenantNamespace);
      setBaseUrl(api.baseUrl);
      const ctx = await api.getBusinessContext({
        bypassCache,
        signal: controller.signal,
      });
      if (controller.signal.aborted || abortRef.current !== controller) return;
      setContext(ctx);
    } catch (err) {
      if (
        controller.signal.aborted ||
        abortRef.current !== controller ||
        (err instanceof FrihetApiError && err.errorCode === "request_aborted")
      ) {
        return;
      }
      const apiErr =
        err instanceof FrihetApiError
          ? err
          : new FrihetApiError(
              500,
              "unexpected_error",
              err instanceof Error ? err.message : String(err),
            );
      setContext(null);
      setError(apiErr);
    } finally {
      if (!controller.signal.aborted && abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceStatus();
    return () => abortRef.current?.abort();
  }, [loadWorkspaceStatus]);

  const stats = globalTenantCache.getStats();
  const businessName =
    context?.business?.name ??
    context?.company?.name ??
    (error ? "Unauthenticated / Error" : "Loading...");
  const currency =
    context?.business?.currency ?? context?.company?.currency ?? "EUR";
  const fiscalZone =
    context?.business?.fiscalZone ?? context?.company?.taxRegime ?? "—";
  const planName = context?.plan?.name ?? context?.plan?.tier ?? "—";

  const detailMarkdown = [
    "# Connected Workspace",
    "",
    `**${businessName}**  `,
    `**Currency:** ${currency} · **Plan:** ${planName}  `,
    `**Fiscal zone:** ${fiscalZone}`,
    "",
    "## Workspace Cache",
    "Cached records stay in memory and are kept separate for each API key. Reopen the command after changing your key to connect to the new workspace.",
    "",
    "**Purge Workspace Cache** cancels pending requests, clears this command's cached records and refreshes the connection.",
    "",
    `**API:** ${baseUrl}  `,
    `**Connection fingerprint:** \`${tenantHash}\``,
  ].join("\n");

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="Active Frihet Workspace">
        <List.Item
          id="workspace-status"
          icon={{
            source: error ? Icon.ExclamationMark : Icon.Building,
            tintColor: error ? Color.Red : Color.Green,
          }}
          title={businessName}
          accessories={[
            {
              tag: {
                value: error
                  ? `Error ${error.statusCode}`
                  : context
                    ? "Connected"
                    : "Connecting",
                color: error ? Color.Red : Color.Green,
              },
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={
                error
                  ? `# Connection Issue\n\n${error.remediation}\n\n---\n${detailMarkdown}`
                  : detailMarkdown
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Cached Entries"
                    text={String(stats.cachedEntryCount)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Generation"
                    text={String(stats.generation)}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Switch API Key in Extension Preferences"
                icon={Icon.Key}
                onAction={() => void openExtensionPreferences()}
              />
              <Action
                title="Purge Workspace Cache & Refresh"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={async () => {
                  clearActiveWorkspaceCache();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Workspace cache purged",
                    message:
                      "All cached records and in-flight requests were cleared.",
                  });
                  await loadWorkspaceStatus(true);
                }}
              />
              <Action.OpenInBrowser
                title="Open Frihet API Key Settings"
                url="https://app.frihet.io/settings/api"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
