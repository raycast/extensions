import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  type Image,
  type LaunchProps,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, useCachedState, useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ComposeForm, WebhookForm } from "./components/forms";
import { chatMarkdown } from "./lib/chat-markdown";
import { chatLink, deliver, promptLink, PROMPT_LIMIT, quicklinkFor } from "./lib/deliver";
import { type Bot, filterBots, loadRoster } from "./lib/roster";
import { loadWebhooks, saveWebhook } from "./lib/webhooks";

const SHAPE_ICONS: Record<string, Icon> = {
  cloud: Icon.Cloud,
  house: Icon.House,
  star: Icon.Star,
  heart: Icon.Heart,
  teardrop: Icon.Raindrop,
  sparkle: Icon.Stars,
  tablet: Icon.Mobile,
  clover: Icon.Leaf,
};

const AVATAR_COLORS: Record<string, Color.ColorLike> = {
  red: Color.Red,
  orange: Color.Orange,
  yellow: Color.Yellow,
  green: Color.Green,
  blue: Color.Blue,
  violet: Color.Purple,
  magenta: Color.Magenta,
  cyan: "#2CB5C9",
  brown: "#9A6B4B",
};

function botIcon(bot: Bot): Image.ImageLike {
  if (bot.isGroup) return { source: Icon.TwoPeople, tintColor: AVATAR_COLORS[bot.avatarColor] };
  return { source: SHAPE_ICONS[bot.avatarShape] ?? Icon.Circle, tintColor: AVATAR_COLORS[bot.avatarColor] };
}

function preview(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

type SortOrder = Preferences.ChatWithBot["sortOrder"];

const byName = (a: Bot, b: Bot) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });

/** The list's sections: one "Bots" section, or Grok Bot's own sidebar sections when sorting by sidebar order. */
function groupBots(bots: Bot[], sortOrder: SortOrder, title: string): { title: string; bots: Bot[] }[] {
  if (sortOrder !== "sidebar") return [{ title, bots }];
  const groups = new Map<string, Bot[]>();
  for (const bot of bots) {
    const group = bot.isPinned ? "Pinned" : (bot.section ?? "Bots");
    groups.set(group, [...(groups.get(group) ?? []), bot]);
  }
  return [...groups].map(([group, members]) => ({ title: group, bots: members }));
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ChatWithBot }>) {
  const promptArg = props.arguments.prompt?.trim() ?? "";
  const { showHidden, dataDir, sortOrder } = getPreferenceValues<Preferences.ChatWithBot>();
  // The recent-messages panel; remembered between launches.
  const [showingDetail, setShowingDetail] = useCachedState("show-recent-messages", false);

  // Read Grok Bot's roster fresh on every launch (the last result shows instantly while it loads).
  const roster = useCachedPromise(loadRoster, [dataDir], { keepPreviousData: true });
  const webhooks = useCachedPromise(loadWebhooks, []);
  const [searchText, setSearchText] = useState("");

  const sendOnModEnter = roster.data?.sendOnModEnter ?? false;
  const bots = useMemo(
    () => (roster.data?.bots ?? []).filter((bot) => showHidden || !bot.isHidden),
    [roster.data, showHidden],
  );
  const filtered = useMemo(() => filterBots(bots, searchText), [bots, searchText]);
  const { data: byUse, visitItem, resetRanking } = useFrecencySorting(filtered, { key: (bot) => bot.id });
  const sorted = useMemo(() => {
    switch (sortOrder) {
      case "recent":
        return [...filtered].sort((a, b) => b.lastActivityAt - a.lastActivityAt);
      case "sidebar":
        return [...filtered].sort((a, b) => a.sidebarOrder - b.sidebarOrder);
      case "alphabetical":
        return [...filtered].sort(byName);
      default:
        return byUse;
    }
  }, [filtered, byUse, sortOrder]);
  const groups = groupBots(sorted, sortOrder, promptArg ? `Prompt: ${preview(promptArg)}` : "Bots");

  const sendTo = (bot: Bot, prompt: string) =>
    void (async () => {
      await visitItem(bot);
      await deliver(bot, prompt, { webhook: webhooks.data?.[bot.id], sendOnModEnter });
    })();

  return (
    <List
      isLoading={roster.isLoading}
      isShowingDetail={showingDetail && sorted.length > 0}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={promptArg ? "Which Bot should get this prompt?" : "Search your Grok Bots…"}
    >
      {roster.error && !roster.data ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load your Grok Bots"
          description={roster.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={roster.revalidate} />
            </ActionPanel>
          }
        />
      ) : roster.isLoading ? null : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching Bots"
          description={`No Bot name has a word starting with "${searchText}".`}
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title} subtitle={String(group.bots.length)}>
          {group.bots.map((bot) => {
            const webhook = webhooks.data?.[bot.id];
            const accessories: List.Item.Accessory[] = [];
            if (bot.unreadCount > 0)
              accessories.push({ tag: { value: String(bot.unreadCount), color: Color.Red }, tooltip: "Unread" });
            // With the panel open there's little room: keep just the unread count.
            if (!showingDetail && webhook)
              accessories.push({ icon: Icon.Bolt, tooltip: "Sends through its routine webhook" });
            if (!showingDetail && bot.isPinned) accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });
            if (!showingDetail && bot.isGroup) accessories.push({ tag: "Group" });
            if (!showingDetail && bot.isHidden)
              accessories.push({ icon: Icon.EyeDisabled, tooltip: "Hidden from sidebar" });
            if (!showingDetail && bot.lastActivityAt)
              accessories.push({
                date: new Date(bot.lastActivityAt),
                tooltip: bot.section ? `Last activity · ${bot.section}` : "Last activity",
              });

            const compose = (initialPrompt?: string) => (
              <ComposeForm
                bot={bot}
                initialPrompt={initialPrompt}
                webhook={webhook}
                sendOnModEnter={sendOnModEnter}
                onSend={() => visitItem(bot)}
              />
            );

            return (
              <List.Item
                key={bot.id}
                icon={botIcon(bot)}
                title={bot.name}
                subtitle={
                  bot.lastMessage && !showingDetail
                    ? { value: preview(bot.lastMessage.text, 90), tooltip: preview(bot.lastMessage.text, 400) }
                    : undefined
                }
                keywords={[bot.displayName]}
                accessories={accessories}
                detail={showingDetail ? <List.Item.Detail markdown={chatMarkdown(bot)} /> : undefined}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {promptArg ? (
                        <>
                          <Action
                            title={`Send to ${bot.firstName}`}
                            icon={Icon.Message}
                            onAction={() => sendTo(bot, promptArg)}
                          />
                          <Action.Push
                            title="Edit Prompt…"
                            icon={Icon.Pencil}
                            shortcut={Keyboard.Shortcut.Common.Edit}
                            target={compose(promptArg)}
                          />
                        </>
                      ) : (
                        <Action.Push title="Write Prompt…" icon={Icon.Message} target={compose()} />
                      )}
                      <Action.Open
                        title="Open Chat in Grok Bot"
                        icon={Icon.AppWindow}
                        target={chatLink(bot.id)}
                        shortcut={Keyboard.Shortcut.Common.Open}
                        onOpen={() => void visitItem(bot)}
                      />
                      <Action
                        title={showingDetail ? "Hide Recent Messages" : "Show Recent Messages"}
                        icon={Icon.Sidebar}
                        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Setup">
                      <Action.Push
                        title={webhook ? "Edit Webhook…" : "Set up Webhook…"}
                        icon={Icon.Bolt}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "w" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "w" },
                        }}
                        target={<WebhookForm bot={bot} webhook={webhook} onSaved={webhooks.revalidate} />}
                      />
                      {webhook && (
                        <Action
                          title="Remove Webhook"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            await saveWebhook(bot.id, undefined);
                            webhooks.revalidate();
                            await showToast({
                              style: Toast.Style.Success,
                              title: `Removed ${bot.firstName}'s webhook`,
                            });
                          }}
                        />
                      )}
                      <Action.CreateQuicklink
                        title={`Create Quicklink for ${bot.firstName}`}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "l" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "l" },
                        }}
                        quicklink={{ name: `Ask ${bot.displayName}`, link: quicklinkFor(bot) }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Bot ID"
                        content={bot.id}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      {promptArg && promptArg.length <= PROMPT_LIMIT && (
                        <Action.CopyToClipboard title="Copy Prompt Link" content={promptLink(bot.id, promptArg)} />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Reload Bots"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={roster.revalidate}
                      />
                      {sortOrder === "frequent" && (
                        <Action
                          title="Reset Ranking"
                          icon={Icon.ArrowCounterClockwise}
                          onAction={() => resetRanking(bot)}
                        />
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
