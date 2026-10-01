import { Action, ActionPanel, Clipboard, Icon, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { memo } from "react";
import { toOpenableUrl, websiteLabels } from "./format";
import { ItemDetailStore } from "./item-detail-store";
import { ItemView } from "./item-view";
import { NoteView } from "./note-view";
import { platformShortcut } from "./shortcuts";
import { Item, ItemDetail } from "./types";
import { getCurrentTotpCode } from "./use-totp-code";

interface ItemActionsProps {
  item: Item;
  detail?: ItemDetail;
  store: ItemDetailStore;
  /** Given in the list only: the item view has no details panel. */
  isShowingDetail?: boolean;
  onToggleDetail?: () => void;
  onRefresh?: () => void;
  onUse: (item: Item) => void;
}

export const ItemActions = memo(function ItemActions({
  item,
  detail,
  store,
  isShowingDetail,
  onToggleDetail,
  onRefresh,
  onUse,
}: ItemActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  // Keeps secrets out of Raycast's clipboard history.
  const concealSecrets = preferences.copyPasswordTransient ?? true;
  // Loaded details are newer than the cached item, e.g. when a password was added since.
  const hasPassword = item.type === "login" && (detail ? detail.password !== undefined : item.hasPassword !== false);
  // Copy Password only takes Enter where there's a password to copy; notes open with Show Note.
  const viewDetailsFirst =
    (preferences.primaryAction ?? "details") === "details" || (!hasPassword && item.type !== "note");
  const urls = detail?.urls ?? item.urls ?? [];
  const websiteNames = websiteLabels(urls);

  async function loadDetail(): Promise<ItemDetail> {
    const loaded = store.peek(item);
    if (loaded) return loaded;
    await showToast({ style: Toast.Style.Animated, title: "Loading Item…" });
    return store.load(item);
  }

  async function copy(label: string, getValue: () => Promise<string | undefined>, isSecret: boolean) {
    try {
      const value = await getValue();
      if (!value) {
        await showToast({ style: Toast.Style.Failure, title: `No ${label} Saved for This Item` });
        return;
      }
      await Clipboard.copy(value, { concealed: isSecret && concealSecrets });
      onUse(item);
      await showToast({ style: Toast.Style.Success, title: `${label} Copied` });
    } catch (error: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to Copy ${label}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function getTotpCode(): Promise<string> {
    return getCurrentTotpCode(item, store.peek(item));
  }

  // The item view shows the full note and has no panel: View Details and Show Note are only offered in the list.
  const isInList = onToggleDetail !== undefined;
  const viewDetailsAction = isInList ? (
    <Action.Push
      title="View Details"
      icon={Icon.Info}
      target={<ItemView item={item} store={store} onUse={onUse} />}
      onPush={() => onUse(item)}
    />
  ) : null;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {viewDetailsFirst && viewDetailsAction}
        {hasPassword && (
          <Action
            title="Copy Password"
            icon={Icon.Key}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => copy("Password", async () => (await loadDetail()).password, true)}
          />
        )}
        {isInList && item.type === "note" && (
          <Action.Push
            title="Show Note"
            icon={Icon.Eye}
            shortcut={platformShortcut(["cmd", "shift"], "n")}
            target={<NoteView item={item} store={store} />}
          />
        )}
        {item.type === "note" && (
          <Action
            title="Copy Note"
            icon={Icon.Document}
            shortcut={platformShortcut(["cmd"], "n")}
            onAction={() => copy("Note", async () => (await loadDetail()).note, true)}
          />
        )}
        {item.username && (
          <Action
            title="Copy Username"
            icon={Icon.Person}
            shortcut={platformShortcut(["cmd", "shift"], "u")}
            onAction={() => copy("Username", async () => item.username, false)}
          />
        )}
        {item.email && (
          <Action
            title="Copy Email"
            icon={Icon.Envelope}
            shortcut={platformShortcut(["cmd", "opt"], "c")}
            onAction={() => copy("Email", async () => item.email, false)}
          />
        )}
        {item.hasTotp && (
          <Action
            title="Copy 2FA Code"
            icon={Icon.Clock}
            shortcut={platformShortcut(["cmd"], "t")}
            onAction={() => copy("2FA Code", getTotpCode, true)}
          />
        )}
        <Action
          title="Copy Title"
          icon={Icon.Text}
          // ⌘⇧. like Copy Name on macOS; Copy Name's Windows shortcut (Ctrl+Alt+C) is Copy Email's here.
          shortcut={platformShortcut(["cmd", "shift"], ".")}
          onAction={() => copy("Title", async () => item.title, false)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {urls[0] && (
          <Action.OpenInBrowser
            title="Open Website"
            url={toOpenableUrl(urls[0])}
            shortcut={Keyboard.Shortcut.Common.Open}
            onOpen={() => onUse(item)}
          />
        )}
        {urls[0] && (
          <Action
            title="Copy Website URL"
            icon={Icon.Link}
            shortcut={platformShortcut(["cmd"], "u")}
            onAction={() => copy("URL", async () => urls[0], false)}
          />
        )}
        {isInList && item.type !== "note" && (item.hasNote || detail?.note) && (
          <Action.Push
            title="Show Note"
            icon={Icon.Eye}
            shortcut={platformShortcut(["cmd", "shift"], "n")}
            target={<NoteView item={item} store={store} />}
          />
        )}
        {item.type !== "note" && (item.hasNote || detail?.note) && (
          <Action
            title="Copy Note"
            icon={Icon.Document}
            shortcut={platformShortcut(["cmd"], "n")}
            onAction={() => copy("Note", async () => (await loadDetail()).note, true)}
          />
        )}
      </ActionPanel.Section>
      {detail?.customFields && detail.customFields.length > 0 && (
        <ActionPanel.Section title="Custom Fields">
          {detail.customFields.map((field, index) => (
            <Action
              key={`${field.name}-${index}`}
              title={`Copy ${field.name}`}
              icon={Icon.Clipboard}
              shortcut={
                index < 9
                  ? platformShortcut(
                      ["cmd", "shift"],
                      String(index + 1) as "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9",
                    )
                  : undefined
              }
              onAction={() => copy(field.name, async () => field.value, field.type === "hidden")}
            />
          ))}
        </ActionPanel.Section>
      )}
      {urls.length > 1 && (
        <ActionPanel.Section title="Websites">
          {urls.map((url, index) => (
            <Action.OpenInBrowser
              key={`${url}-${index}`}
              title={`Open ${websiteNames[index]}`}
              url={toOpenableUrl(url)}
            />
          ))}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {!viewDetailsFirst && viewDetailsAction}
        {isInList && (
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={platformShortcut(["cmd"], "d")}
            onAction={onToggleDetail}
          />
        )}
        {onRefresh && (
          <Action
            title="Refresh Items"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Debug">
        <Action
          title="Copy Item Debug Info"
          icon={Icon.Bug}
          shortcut={platformShortcut(["cmd", "shift"], "d")}
          onAction={async () => {
            await Clipboard.copy(
              JSON.stringify(
                {
                  type: item.type,
                  hasPassword: item.hasPassword,
                  hasUsername: Boolean(item.username),
                  hasEmail: Boolean(item.email),
                  urlCount: urls.length,
                  hasTotp: item.hasTotp,
                  hasNote: detail ? Boolean(detail.note) : undefined,
                  customFieldsCount: detail ? (detail.customFields?.length ?? 0) : undefined,
                },
                null,
                2,
              ),
            );
            await showToast({ style: Toast.Style.Success, title: "Debug Info Copied" });
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});
