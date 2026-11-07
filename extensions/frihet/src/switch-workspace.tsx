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
import { useCallback, useEffect, useState } from "react";
import { buildFrihetDeepLink, FrihetApiError } from "./lib/frihet-client.js";
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

  const loadWorkspaceStatus = useCallback(async (bypassCache = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const api = createClientFromPreferences();
      setTenantHash(api.tenantNamespace);
      setBaseUrl(api.baseUrl);
      const ctx = await api.getBusinessContext({ bypassCache });
      setContext(ctx);
    } catch (err) {
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceStatus();
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
    `# Workspace & Tenant Isolation (\`AUTH-02\`)`,
    "",
    `**Connected Business:** ${businessName}  `,
    `**Tenant Cache Namespace (SHA-256):** \`${tenantHash}\`  `,
    `**Cache Generation:** \`${stats.generation}\` · **Cached Entries:** \`${stats.cachedEntryCount}\`  `,
    `**API Endpoint:** \`${baseUrl}\`  `,
    "",
    "## Cross-Workspace Safety Guarantee",
    "- Every cached response and in-flight `AbortController` is bound to the SHA-256 fingerprint of `(apiBaseUrl, apiKey)`.",
    "- Changing the API key in Raycast Extension Preferences or running **Purge Workspace Cache** immediately aborts all pending requests and wipes all cached records.",
    "- Zero customer or financial records are ever persisted to unencrypted disk.",
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
          subtitle={`Namespace: ${tenantHash}`}
          accessories={[
            {
              tag: {
                value: error
                  ? `Error ${error.statusCode}`
                  : `${currency} · ${planName}`,
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
                    title="Business Name"
                    text={businessName}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Currency"
                    text={currency}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Fiscal Zone"
                    text={String(fiscalZone)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Plan"
                    text={String(planName)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Tenant Namespace"
                    text={tenantHash}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Cached Entries"
                    text={String(stats.cachedEntryCount)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Cache Generation"
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
                url={buildFrihetDeepLink("dashboard")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
