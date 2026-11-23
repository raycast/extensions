import { Action, ActionPanel, Icon, List, showInFinder, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getDisk } from "./lib/api";
import { diskEntries, type DiskEntry } from "./lib/disk";
import { ago, bytes, shortUrl } from "./lib/format";
import { ReadersView } from "./components/readers";

export default function SearchFloppy() {
  const { data, isLoading, revalidate } = useCachedPromise(getDisk, [], {
    onError: (e) => {
      showFailureToast(e, { title: "Couldn't load your disk" });
    },
  });
  const entries = useMemo(() => (data ? diskEntries(data) : []), [data]);
  const sections = useMemo(() => {
    const by = new Map<string, DiskEntry[]>();
    for (const e of entries) by.set(e.folders[0], [...(by.get(e.folders[0]) ?? []), e]);
    return [...by.entries()];
  }, [entries]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your Floppy Disk">
      {!isLoading && !entries.length ? (
        <List.EmptyView
          icon="floppy.png"
          title="Nothing on your disk yet"
          description="Share a file and it shows up here."
        />
      ) : null}
      {sections.map(([space, items]) => (
        <List.Section key={space} title={space} subtitle={String(items.length)}>
          {items.map((e) => (
            <EntryItem key={e.link.id} entry={e} onRefresh={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function EntryItem({ entry: e, onRefresh }: { entry: DiskEntry; onRefresh: () => void }) {
  const where = e.folders.slice(1).join(" / ");
  return (
    <List.Item
      title={e.name}
      subtitle={{ value: where, tooltip: shortUrl(e.link.url) }}
      icon={e.localPath ? { fileIcon: e.localPath } : e.link.files.length > 1 ? Icon.Folder : Icon.Document}
      keywords={[...e.folders, ...e.link.files.map((f) => f.path), e.link.slug]}
      accessories={[
        { text: bytes(e.size) },
        { text: ago(e.updatedAt), tooltip: new Date(e.updatedAt).toLocaleString() },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Link" content={e.link.url} />
            <Action.OpenInBrowser url={e.link.url} />
            {e.localPath ? (
              <Action
                title="Show in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => showInFinder(e.localPath as string)}
              />
            ) : null}
            {e.localPath ? (
              <Action.Open title="Open File" target={e.localPath} shortcut={Keyboard.Shortcut.Common.Open} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Who Read It"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              target={<ReadersView linkId={e.link.id} name={e.name} url={e.link.url} />}
            />
            <Action.Paste
              title="Paste Link"
              content={e.link.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={`[${e.name}](${e.link.url})`}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      quickLook={e.localPath ? { path: e.localPath, name: e.name } : undefined}
    />
  );
}
