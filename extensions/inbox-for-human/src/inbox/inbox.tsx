import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { ageSection, displayTitle, relativeAge } from "./format";
import { archiveIds, loadQueue, markOpened, watchQueue, type QueueEntry } from "./queue";
import { archivePathFor, resolveQueuePath } from "./queue-path";
import { secondaryOpenTarget, type SecondaryOpenTarget } from "./opener";
import {
  DAMAGED_TITLE,
  EMPTY_INBOX,
  FIRST_RUN,
  INSTALL_PROMPT,
  MARK_OPENED_FAILED,
  OPEN_FAILED,
  SKILL_URL,
  archiveAllAlert,
  archiveFailedTitle,
  damagedDescription,
  emptyView,
  isSetUp,
  tildify,
} from "./empty-state-content";

const SEARCH_PLACEHOLDER = "Search inbox...";

async function readInbox(queuePath: string) {
  return { load: loadQueue(queuePath), setUp: isSetUp(queuePath) };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.Inbox>();
  const queuePath = useMemo(() => resolveQueuePath(), []);
  const archivePath = useMemo(() => archivePathFor(queuePath), [queuePath]);
  const { data, isLoading, revalidate } = usePromise(readInbox, [queuePath]);

  // Keep the view in sync with the skill's writes while Raycast keeps this
  // command warm; without the watcher new files wouldn't appear until a cold
  // relaunch. The ref keeps one watcher however often revalidate changes.
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;
  useEffect(() => watchQueue(queuePath, () => revalidateRef.current()), [queuePath]);

  const entries = data?.load.entries ?? [];
  const sections = useMemo(() => groupBySection(entries), [entries]);

  async function handleOpen(entry: QueueEntry, target?: SecondaryOpenTarget) {
    try {
      if (target?.kind === "url") await open(target.url);
      else if (target?.kind === "app") await open(target.path, target.appPath);
      else await open(entry.path);
    } catch (err) {
      await showFailureToast(err, { title: OPEN_FAILED });
      return;
    }
    await recordOpened(entry);
  }

  // Writes to the inbox file can fail (no permission, full disk, the skill
  // holding it); show why and stay in the inbox rather than an error screen.
  async function recordOpened(entry: QueueEntry) {
    try {
      await markOpened(queuePath, entry.id);
    } catch (err) {
      await showFailureToast(err, { title: MARK_OPENED_FAILED });
    }
    revalidate();
  }

  async function archive(ids: string[]) {
    try {
      await archiveIds(queuePath, archivePath, ids);
    } catch (err) {
      await showFailureToast(err, { title: archiveFailedTitle(ids.length) });
    }
    revalidate();
  }

  async function handleArchiveAll() {
    if (entries.length === 0) return;
    // Archive exactly the items the alert counted; one the agent adds while
    // it's open stays in the inbox.
    const ids = entries.map((e) => e.id);
    const alert = archiveAllAlert(ids.length);
    const confirmed = await confirmAlert({
      title: alert.title,
      message: alert.message,
      icon: Icon.Box,
      primaryAction: { title: alert.button, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await archive(ids);
  }

  const configureAction = (
    <Action
      title="Configure Extension"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      onAction={openExtensionPreferences}
    />
  );

  if (!data) {
    // Until the first read finishes, an empty title keeps Raycast from
    // flashing its "No Results" screen.
    return (
      <List isLoading={isLoading} searchBarPlaceholder={SEARCH_PLACEHOLDER}>
        <List.EmptyView title="" />
      </List>
    );
  }

  const view = emptyView(data.load, data.setUp);
  if (view === "first-run") {
    return (
      <List searchBarPlaceholder={SEARCH_PLACEHOLDER}>
        <List.EmptyView
          title={FIRST_RUN.title}
          description={FIRST_RUN.description}
          icon={Icon.Tray}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Prompt" content={INSTALL_PROMPT} />
              <Action.OpenInBrowser title="Open Skill on GitHub" url={SKILL_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (view === "damaged") {
    return (
      <List searchBarPlaceholder={SEARCH_PLACEHOLDER}>
        <List.EmptyView
          title={DAMAGED_TITLE}
          description={damagedDescription(tildify(queuePath))}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.ShowInFinder title="Show in Finder" path={queuePath} />
              <Action.CopyToClipboard title="Copy Path" content={queuePath} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (view === "empty") {
    return (
      <List searchBarPlaceholder={SEARCH_PLACEHOLDER}>
        <List.EmptyView
          title={EMPTY_INBOX.title}
          description={EMPTY_INBOX.description}
          icon={Icon.Tray}
          actions={<ActionPanel>{configureAction}</ActionPanel>}
        />
      </List>
    );
  }

  return (
    <List isShowingDetail searchBarPlaceholder={SEARCH_PLACEHOLDER}>
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.entries.map((entry) => {
            const title = displayTitle(entry.path);
            const md = `# ${title}\n\n${entry.ask}\n\n${entry.context}`;
            const target = secondaryOpenTarget(prefs, entry);
            return (
              <List.Item
                key={entry.id}
                title={title}
                icon={{ fileIcon: entry.path }}
                accessories={[{ text: relativeAge(entry.timestamp) }]}
                detail={
                  <List.Item.Detail
                    markdown={md}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Path" text={tildify(entry.path)} />
                        <List.Item.Detail.Metadata.Label title="Queued" text={`${relativeAge(entry.timestamp)} ago`} />
                        {entry.opened_at && (
                          <List.Item.Detail.Metadata.Label
                            title="Opened"
                            text={`${relativeAge(entry.opened_at)} ago`}
                          />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Open" icon={Icon.ArrowNe} onAction={() => handleOpen(entry)} />
                    {target.kind === "pick" ? (
                      <Action.OpenWith
                        path={entry.path}
                        shortcut={Keyboard.Shortcut.Common.Open}
                        onOpen={() => recordOpened(entry)}
                      />
                    ) : (
                      <Action
                        title={`Open With ${target.appName}`}
                        icon={Icon.AppWindow}
                        shortcut={Keyboard.Shortcut.Common.Open}
                        onAction={() => handleOpen(entry, target)}
                      />
                    )}
                    <Action.ShowInFinder
                      title="Show in Finder"
                      path={entry.path}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                    <Action
                      title="Archive"
                      icon={Icon.Box}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => archive([entry.id])}
                    />
                    <Action
                      title="Archive All"
                      icon={Icon.Box}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      style={Action.Style.Destructive}
                      onAction={handleArchiveAll}
                    />
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={entry.path}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    {configureAction}
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

type Section = {
  title: "Today" | "Yesterday" | "Earlier";
  entries: QueueEntry[];
};

/**
 * Group entries by recency section, preserving newest-first ordering within
 * each section.
 */
function groupBySection(entries: QueueEntry[], now: Date = new Date()): Section[] {
  const ordered = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const map = new Map<Section["title"], QueueEntry[]>();
  for (const e of ordered) {
    const key = ageSection(e.timestamp, now);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  const titles: Section["title"][] = ["Today", "Yesterday", "Earlier"];
  return titles.filter((t) => map.has(t)).map((t) => ({ title: t, entries: map.get(t)! }));
}
