import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { connectionPortalUrl } from "./lib/data";
import { useConnections } from "./lib/hooks";
import { authMode } from "./lib/preferences";
import { formatDate } from "./lib/format";
import { NavigationActions, RefreshAction } from "./components/actions";
import { classifyError, ListEmpty } from "./components/empty";

async function openPortal(opts?: { reconnect?: string }) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Requesting Connection Portal link…" });
  try {
    const url = await connectionPortalUrl(opts);
    await open(url);
    toast.style = Toast.Style.Success;
    toast.title = "Connection Portal opened";
    toast.message = "Read-only connection. Come back and refresh when you're done.";
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't open the Connection Portal";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

export default function ConnectBrokerage() {
  const { connections, isLoading, error, refresh } = useConnections();
  const demo = authMode() === "fixtures";
  const list = connections ?? [];

  const connectAction = (
    <Action title="Connect a Brokerage (Read-Only)" icon={Icon.Link} onAction={() => openPortal()} />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search connections…">
      {error && list.length === 0 ? (
        <ListEmpty kind={classifyError(error)} error={error} onRetry={refresh} />
      ) : !isLoading && list.length === 0 ? (
        <List.EmptyView
          icon={Icon.Link}
          title="No brokerage connected"
          description="Open the SnapTrade Connection Portal to link Wealthsimple, Questrade, IBKR and 20+ others. Read-only."
          actions={
            <ActionPanel>
              {connectAction}
              <RefreshAction onRefresh={refresh} />
              <NavigationActions />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Add">
            <List.Item
              icon={{ source: Icon.PlusCircle, tintColor: Color.Blue }}
              title="Connect a brokerage"
              subtitle={
                demo
                  ? "Demo mode: disable fixtures to open the real portal"
                  : "Opens the SnapTrade Connection Portal (read-only)"
              }
              actions={
                <ActionPanel>
                  {connectAction}
                  <RefreshAction onRefresh={refresh} />
                  <NavigationActions />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Connections" subtitle={`${list.length}`}>
            {list.map((c) => {
              const name = c.brokerage?.display_name ?? c.brokerage?.name ?? c.name ?? "Brokerage";
              const disabled = Boolean(c.disabled);
              return (
                <List.Item
                  key={c.id ?? name}
                  icon={{
                    source: disabled ? Icon.ExclamationMark : Icon.CheckCircle,
                    tintColor: disabled ? Color.Red : Color.Green,
                  }}
                  title={name}
                  subtitle={c.type === "trade" ? "trade-enabled connection" : "read-only"}
                  keywords={[c.brokerage?.slug ?? ""]}
                  accessories={[
                    ...(disabled
                      ? [
                          {
                            tag: { value: "Disabled", color: Color.Red },
                            tooltip: c.disabled_date ? `Disabled ${formatDate(c.disabled_date)}` : "Needs reconnect",
                          },
                        ]
                      : [{ tag: { value: "Active", color: Color.Green } }]),
                    { text: `Connected ${formatDate(c.created_date)}` },
                  ]}
                  actions={
                    <ActionPanel>
                      {disabled && c.id ? (
                        <Action title="Reconnect" icon={Icon.Repeat} onAction={() => openPortal({ reconnect: c.id })} />
                      ) : null}
                      {connectAction}
                      {c.id ? <Action.CopyToClipboard title="Copy Connection ID" content={c.id} /> : null}
                      <RefreshAction onRefresh={refresh} />
                      <NavigationActions />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
