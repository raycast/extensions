import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildFrihetDeepLink, FrihetApiError } from "./lib/frihet-client.js";
import {
  clearActiveWorkspaceCache,
  createClientFromPreferences,
} from "./lib/runtime-client.js";
import type {
  ClientActivityRecord,
  ClientAddress,
  ClientRecord,
} from "./lib/types.js";

const PAGE_LIMIT = 20;

function formatAddress(addr?: ClientAddress | string): string {
  if (!addr) return "—";
  if (typeof addr === "string") return addr.trim() || "—";
  const parts = [
    addr.street,
    addr.postalCode,
    addr.city,
    addr.state,
    addr.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

type ClientActivitiesState =
  | { status: "loading" }
  | { status: "success"; data: ClientActivityRecord[] }
  | { status: "error"; message: string };

function renderClientMarkdown(
  client: ClientRecord,
  state?: ClientActivitiesState,
): string {
  const lines: string[] = [
    `# ${client.name}`,
    "",
    `**Email:** ${client.email ?? "—"}  `,
    `**Phone:** ${client.phone ?? "—"}  `,
    `**Tax ID (NIF/VAT):** ${client.taxId ?? "—"}  `,
    `**Address:** ${formatAddress(client.address)}  `,
    "",
    "## Recent CRM Activities",
    "",
  ];

  if (!state) {
    lines.push(
      "_Select this client or press **Enter** to load recent CRM activities._",
    );
  } else if (state.status === "loading") {
    lines.push("_Loading recent CRM activities..._");
  } else if (state.status === "error") {
    lines.push(
      `> ⚠️ **Could not load CRM activities:** ${state.message}`,
      "",
      "_Select **Retry Loading CRM Activities** from the actions menu to try again._",
    );
  } else if (state.data.length === 0) {
    lines.push("_No recorded CRM activities for this client._");
  } else {
    for (const act of state.data) {
      const dateStr =
        (act.date ?? act.createdAt ?? "").slice(0, 10) || "Recent";
      const typeLabel = (act.type ?? "activity").toUpperCase();
      const summary = act.title ?? act.description ?? act.notes ?? act.id;
      lines.push(`- **[${typeLabel}]** (${dateStr}): ${summary}`);
    }
  }

  return lines.join("\n");
}

export default function SearchClientsCommand() {
  const [searchText, setSearchText] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [activitiesByClient, setActivitiesByClient] = useState<
    Record<string, ClientActivitiesState>
  >({});
  const [total, setTotal] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FrihetApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback(
    async (opts?: {
      cursor?: string;
      append?: boolean;
      bypassCache?: boolean;
    }) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      try {
        const api = createClientFromPreferences();
        const page = await api.listClients({
          q: searchText,
          limit: PAGE_LIMIT,
          after: opts?.cursor,
          bypassCache: opts?.bypassCache,
          signal: controller.signal,
        });

        setClients((prev) =>
          opts?.append ? [...prev, ...page.data] : page.data,
        );
        setTotal(page.total);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (
          err instanceof FrihetApiError &&
          err.errorCode === "request_aborted"
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
        if (!opts?.append) {
          setClients([]);
        }
        setError(apiErr);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load clients",
          message: apiErr.remediation,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [searchText],
  );

  useEffect(() => {
    void fetchClients();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchClients]);

  const loadClientActivities = useCallback(
    async (clientId: string, opts?: { force?: boolean }) => {
      const existing = activitiesByClient[clientId];
      if (existing && !opts?.force) {
        if (existing.status === "loading" || existing.status === "success") {
          return;
        }
      }
      setActivitiesByClient((prev) => ({
        ...prev,
        [clientId]: { status: "loading" },
      }));
      try {
        const api = createClientFromPreferences();
        const page = await api.listClientActivities(clientId, { limit: 10 });
        setActivitiesByClient((prev) => ({
          ...prev,
          [clientId]: { status: "success", data: page.data },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setActivitiesByClient((prev) => ({
          ...prev,
          [clientId]: { status: "error", message },
        }));
      }
    },
    [activitiesByClient],
  );

  const deepLinkUrl = buildFrihetDeepLink("clients");
  const isPartialPage = Boolean(nextCursor) || total > clients.length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={clients.length > 0}
      searchBarPlaceholder="Search clients by name, email, or tax ID..."
      onSearchTextChange={setSearchText}
      throttle
      onSelectionChange={(id) => {
        if (id) {
          void loadClientActivities(id);
        }
      }}
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={
            error.isAuthError
              ? "Authentication Required (401)"
              : `Unable to Load Clients (${error.statusCode})`
          }
          description={error.remediation}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
              <Action
                title="Retry Request"
                icon={Icon.RotateClockwise}
                onAction={() => void fetchClients({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Clients"
                url={deepLinkUrl}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="No Matching Clients"
          description={
            searchText
              ? `No clients matched query "${searchText}".`
              : "No clients found in this Frihet workspace."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Clients"
                icon={Icon.RotateClockwise}
                onAction={() => void fetchClients({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Clients"
                url={deepLinkUrl}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section
        title="Clients"
        subtitle={
          isPartialPage
            ? `Showing ${clients.length} of ${total} clients (Partial Page)`
            : `${clients.length} of ${total} clients (Complete)`
        }
      >
        {clients.map((cli) => {
          const activities = activitiesByClient[cli.id];
          return (
            <List.Item
              key={cli.id}
              id={cli.id}
              icon={{ source: Icon.Person, tintColor: Color.Blue }}
              title={cli.name}
              subtitle={cli.email ?? ""}
              accessories={[
                ...(cli.taxId
                  ? [{ tag: { value: cli.taxId, color: Color.SecondaryText } }]
                  : []),
                ...(cli.stage ? [{ text: cli.stage }] : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={renderClientMarkdown(cli, activities)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Client Name"
                        text={cli.name}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Client ID"
                        text={cli.id}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Email"
                        text={cli.email ?? "—"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Phone"
                        text={cli.phone ?? "—"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Tax ID"
                        text={cli.taxId ?? "—"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Address"
                        text={formatAddress(cli.address)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="CRM Activities"
                        text={
                          !activities
                            ? "Select to load"
                            : activities.status === "loading"
                              ? "Loading..."
                              : activities.status === "error"
                                ? "Failed to load (Select retry)"
                                : `${activities.data.length} record(s)`
                        }
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Client Actions">
                    <Action.OpenInBrowser
                      title="Open in Frihet"
                      url={deepLinkUrl}
                    />
                    {cli.email ? (
                      <Action.CopyToClipboard
                        title="Copy Email"
                        content={cli.email}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    ) : null}
                    {cli.taxId ? (
                      <Action.CopyToClipboard
                        title="Copy Tax ID"
                        content={cli.taxId}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                    ) : null}
                    <Action.CopyToClipboard
                      title="Copy Client ID"
                      content={cli.id}
                    />
                    {activities?.status === "error" ? (
                      <Action
                        title="Retry Loading CRM Activities"
                        icon={Icon.RotateClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={() =>
                          void loadClientActivities(cli.id, { force: true })
                        }
                      />
                    ) : (
                      <Action
                        title="Load CRM Activities"
                        icon={Icon.Clock}
                        onAction={() =>
                          void loadClientActivities(cli.id, { force: true })
                        }
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Workspace & Pagination">
                    {nextCursor ? (
                      <Action
                        title={`Load Next Page (${clients.length}/${total})`}
                        icon={Icon.ArrowDown}
                        onAction={() =>
                          void fetchClients({
                            cursor: nextCursor,
                            append: true,
                          })
                        }
                      />
                    ) : null}
                    <Action
                      title="Refresh & Clear Workspace Cache"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => {
                        clearActiveWorkspaceCache();
                        setActivitiesByClient({});
                        void fetchClients({ bypassCache: true });
                      }}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      onAction={() => void openExtensionPreferences()}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
