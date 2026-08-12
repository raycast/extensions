import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { ItemActivityMap } from "./activity/item-activity";
import type { ItemMetadataMap } from "./items/item-cache";
import { formatItemUrl, serializeItemReference, type ItemSummary } from "./items/item";
import { ItemDetail } from "./items/item-detail";
import { rankItems } from "./items/item-ranking";
import { getLoginIdentifier } from "./items/items";
import { PassCliError, type SessionStatus } from "./pass/pass-cli";
import { modules } from "./raycast/create-modules";
import { importantShortcut } from "./raycast/shortcuts";
type ViewStatus = SessionStatus | { state: "loading" };
export default function Command() {
  const [status, setStatus] = useState<ViewStatus>({ state: "loading" });
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<ItemMetadataMap>({});
  const [activity, setActivity] = useState<ItemActivityMap>({});
  async function load(showFeedback = false) {
    setIsLoading(true);
    if (showFeedback) setStatus({ state: "loading" });
    const toast = showFeedback
      ? await showToast({ style: Toast.Style.Animated, title: "Checking Proton Pass CLI" })
      : undefined;
    try {
      const nextStatus = await modules.session.getStatus();
      setStatus(nextStatus);
      if (nextStatus.state === "ready") {
        const fresh = await modules.items.refresh(await modules.vaults.list());
        setItems(fresh.items);
        setMetadata(fresh.metadata);
        await modules.activity.prune(fresh.items);
        setActivity(await modules.activity.getAll());
        void modules.items.hydrate(fresh.items).then(setMetadata);
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Proton Pass CLI detected";
        }
      } else if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title =
          nextStatus.state === "not_installed" ? "Proton Pass CLI not found" : "Proton Pass CLI unavailable";
      }
    } catch (error) {
      setStatus({ state: "error", message: error instanceof Error ? error.message : "Unknown error" });
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Proton Pass CLI check failed";
        toast.message = errorMessage(error);
      }
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void modules.items.getCached().then(async (cached) => {
      if (cached) {
        setItems(cached.items);
        setMetadata(cached.metadata);
      }
      setActivity(await modules.activity.getAll());
      await load();
    });
  }, []);
  if (status.state !== "ready" && items.length === 0) return <StatusView status={status} onRetry={() => load(true)} />;
  const visibleItems = rankItems(items, activity);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Proton Pass items">
      {visibleItems.map((item) => {
        const key = serializeItemReference(item);
        return (
          <List.Item
            key={key}
            icon={item.type === "alias" ? Icon.Envelope : Icon.Lock}
            title={item.title}
            subtitle={item.vaultName}
            accessories={[
              ...(activity[key]?.pinned ? [{ icon: Icon.Pin }] : []),
              { text: metadata[key]?.email || metadata[key]?.username || item.vaultName },
            ]}
            actions={
              <ItemActions
                item={item}
                isPinned={activity[key]?.pinned ?? false}
                onTogglePin={async () => {
                  await modules.activity.togglePin(item);
                  setActivity(await modules.activity.getAll());
                }}
                onUse={async () => {
                  await modules.activity.markUsed(item);
                  setActivity(await modules.activity.getAll());
                }}
                onRefresh={load}
              />
            }
          />
        );
      })}
      {visibleItems.length === 0 && !isLoading ? <List.EmptyView title="No matching Proton Pass items" /> : null}
    </List>
  );
}
function ItemActions({
  item,
  isPinned,
  onTogglePin,
  onUse,
  onRefresh,
}: {
  item: ItemSummary;
  isPinned: boolean;
  onTogglePin: () => Promise<void>;
  onUse: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const copy = async (field: string, label: string) => {
    try {
      await Clipboard.copy(await modules.items.readField(item, field));
      await onUse();
      await showToast({ style: Toast.Style.Success, title: `${label} copied` });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Unable to copy value", message: errorMessage(error) });
    }
  };

  return (
    <ActionPanel>
      <Action.Push
        title="Show Details"
        icon={Icon.Sidebar}
        target={<ItemDetail item={item} onUse={onUse} onDelete={onRefresh} />}
      />
      <Action
        title={item.type === "alias" ? "Copy Alias" : "Copy Username"}
        icon={Icon.CopyClipboard}
        shortcut={importantShortcut("u")}
        onAction={async () => {
          if (item.type === "alias") return copy("email", "Alias");
          const details = await modules.items.view(item);
          const identifier = getLoginIdentifier(details);
          if (!identifier) throw new PassCliError("This login has no username or email.");
          await Clipboard.copy(identifier);
          await onUse();
          await showToast({ style: Toast.Style.Success, title: "Username copied" });
        }}
      />
      {item.type === "login" ? (
        <Action
          title="Copy Password"
          icon={Icon.Key}
          shortcut={importantShortcut("p")}
          onAction={() => copy("password", "Password")}
        />
      ) : null}
      {item.type === "login" ? (
        <Action
          title="Copy TOTP"
          icon={Icon.Clock}
          shortcut={importantShortcut("t")}
          onAction={() => copy("totp", "TOTP")}
        />
      ) : null}
      <Action
        title="Open URL"
        icon={Icon.Globe}
        onAction={async () => {
          const details = await modules.items.view(item);
          if (details.type !== "login" || !details.urls[0]) throw new PassCliError("This item has no URL.");
          await open(details.urls[0]);
          await onUse();
        }}
      />
      <Action
        title="Copy URL"
        icon={Icon.CopyClipboard}
        shortcut={importantShortcut("l")}
        onAction={async () => {
          const details = await modules.items.view(item);
          if (details.type !== "login" || !details.urls[0]) throw new PassCliError("This item has no URL.");
          await Clipboard.copy(details.urls[0]);
          await showToast({ style: Toast.Style.Success, title: "URL copied" });
          await onUse();
        }}
      />
      <ActionPanel.Section>
        <Action
          title={isPinned ? "Unpin Item" : "Pin Item"}
          icon={Icon.Pin}
          shortcut={importantShortcut("f")}
          onAction={onTogglePin}
        />
        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={importantShortcut("r")} onAction={onRefresh} />
        <Action.CopyToClipboard title="Copy Item Reference" content={formatItemUrl(item)} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger Zone">
        <Action
          title="Delete Item"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: `Delete ${item.title}?`,
              message: "This permanently deletes the item and cannot be undone.",
              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
            });
            if (!confirmed) return;
            try {
              await modules.items.remove(item);
              await modules.activity.remove(item);
              await onRefresh();
              await showToast({ style: Toast.Style.Success, title: "Item deleted" });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Unable to delete item",
                message: errorMessage(error),
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function StatusView({ status, onRetry }: { status: ViewStatus; onRetry: () => Promise<void> }) {
  const messages: Record<Exclude<ViewStatus["state"], "ready" | "loading">, string> = {
    not_installed: "Install Proton Pass CLI to use this extension.",
    not_authenticated: "Log in with Proton Pass CLI, then try again.",
    error: status.state === "error" ? status.message : "Unable to use Proton Pass CLI.",
  };
  const message =
    status.state === "loading" ? "Checking Proton Pass CLI…" : status.state === "ready" ? "" : messages[status.state];
  const isFailure = status.state !== "loading";

  return (
    <List isLoading={status.state === "loading"} searchBarPlaceholder="Proton Pass setup">
      <List.Item
        icon={isFailure ? Icon.ExclamationMark : Icon.Lock}
        title={status.state === "not_installed" ? "Proton Pass CLI not found" : "Proton Pass setup"}
        subtitle={message}
        actions={
          <ActionPanel>
            <Action title="Check Again" onAction={onRetry} />
            {status.state === "not_installed" ? (
              <Action title="Configure CLI Path" icon={Icon.Gear} onAction={openExtensionPreferences} />
            ) : null}
            {status.state === "not_installed" ? (
              <Action.CopyToClipboard title="Copy Detection Diagnostics" content={status.diagnostics} />
            ) : null}
            {status.state === "not_installed" ? (
              <Action.OpenInBrowser
                title="Open Installation Guide"
                url="https://protonpass.github.io/pass-cli/get-started/installation/"
              />
            ) : null}
            {status.state === "not_installed" ? (
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={
                  process.platform === "win32"
                    ? "Invoke-WebRequest -Uri https://proton.me/download/pass-cli/install.ps1 -OutFile install.ps1; .\\install.ps1"
                    : "curl -fsSL https://proton.me/download/pass-cli/install.sh | bash"
                }
              />
            ) : null}
            {status.state === "not_authenticated" ? (
              <Action.OpenInBrowser
                title="Open Login Guide"
                url="https://protonpass.github.io/pass-cli/commands/login/"
              />
            ) : null}
            {status.state === "not_authenticated" ? (
              <Action.CopyToClipboard title="Copy Login Command" content="pass-cli login" />
            ) : null}
            {status.state === "error" ? (
              <Action.OpenInBrowser
                title="Open Troubleshooting Guide"
                url="https://protonpass.github.io/pass-cli/help/troubleshoot/"
              />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

function errorMessage(error: unknown) {
  return error instanceof PassCliError || error instanceof Error ? error.message : "Unknown error";
}
