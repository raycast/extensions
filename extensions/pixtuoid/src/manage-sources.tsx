import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BinaryNotFoundError, getSources, SourceStatus, toggleSource } from "./pixtuoid";

const REPO_URL = "https://github.com/IvanWng97/pixtuoid";

export default function ManageSources() {
  const { data, isLoading, revalidate, error } = usePromise(getSources);

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  async function toggle(item: SourceStatus) {
    if (item.connected) {
      const confirmed = await confirmAlert({
        title: `Disconnect ${item.display_name}?`,
        message: "Removes its hooks from that CLI's config. You can reconnect anytime.",
        primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: item.connected ? `Disconnecting ${item.display_name}…` : `Connecting ${item.display_name}…`,
    });
    try {
      const row = await toggleSource(item.id, item.connected);
      if (row?.outcome?.startsWith("failed")) {
        toast.style = Toast.Style.Failure;
        toast.title = `${item.display_name}: failed`;
        toast.message = row.outcome.replace(/^failed:\s*/, "");
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `${item.display_name} — ${row?.outcome ?? "updated"}`;
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't update source";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      revalidate();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter agent CLIs…">
      <List.EmptyView
        icon={Icon.Plug}
        title={isLoading ? "Loading sources…" : "No sources reported"}
        description="pixtuoid sources --json returned an empty list."
      />
      {(data ?? []).map((s) => (
        <List.Item
          key={s.id}
          icon={iconFor(s)}
          title={s.display_name}
          subtitle={s.id}
          accessories={accessoriesFor(s)}
          actions={
            <ActionPanel>
              <Action
                title={s.connected ? "Disconnect" : "Connect"}
                icon={s.connected ? Icon.XMarkCircle : Icon.PlusCircle}
                onAction={() => toggle(s)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
              <Action.OpenInBrowser icon={Icon.Globe} title="Open Pixtuoid on GitHub" url={REPO_URL} />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const notFound = error instanceof BinaryNotFoundError;
  return (
    <List>
      <List.EmptyView
        icon={notFound ? Icon.MagnifyingGlass : Icon.Warning}
        title={notFound ? "Pixtuoid not found" : "Couldn't read sources"}
        description={
          notFound
            ? "Set the binary path in preferences, or install pixtuoid (cargo install pixtuoid · npm i -g pixtuoid · brew install ivanwng97/pixtuoid/pixtuoid)."
            : error.message
        }
        actions={
          <ActionPanel>
            {notFound ? (
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            ) : (
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            )}
            <Action.OpenInBrowser icon={Icon.Globe} title="Installation Docs" url={`${REPO_URL}#install`} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function iconFor(s: SourceStatus): { source: Icon; tintColor: Color } {
  if (s.connected) return { source: Icon.CheckCircle, tintColor: Color.Green };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function accessoriesFor(s: SourceStatus): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (s.health) {
    accessories.push({ icon: { source: Icon.Warning, tintColor: Color.Yellow }, tooltip: s.health });
  }
  if (!s.cli_present) {
    accessories.push({ tag: { value: "not detected", color: Color.SecondaryText } });
  }
  accessories.push({
    tag: { value: s.connected ? "Connected" : "Disconnected", color: s.connected ? Color.Green : Color.SecondaryText },
  });
  return accessories;
}
