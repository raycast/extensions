import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { callTool, CaptureRow, deepLink, Folder, openInAnycap, parseCaptureLines, parseFolders } from "./anycap";
import { loadDetail } from "./detail";

export const kindIcon: Record<string, Icon> = {
  link: Icon.Link,
  note: Icon.Document,
  image: Icon.Image,
  file: Icon.Paperclip,
  audio: Icon.Microphone,
};

const kinds = [
  { value: "", title: "All Kinds" },
  { value: "link", title: "Links" },
  { value: "note", title: "Notes" },
  { value: "image", title: "Images" },
  { value: "file", title: "Files" },
  { value: "audio", title: "Audio" },
];

function host(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/// Every list of captures: the search, a folder, a collection. `load` gets the
/// words typed and the kind picked; it is asked again when either changes.
export function CaptureList(props: {
  load: (query: string, kind: string) => Promise<string>;
  placeholder: string;
  navigationTitle?: string;
  emptyTitle: (query: string) => string;
  filtering?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (q: string, k: string) => parseCaptureLines(await props.load(q, k)),
    [query, kind],
    { keepPreviousData: true },
  );
  // The kind is kept here as well: recent and list take none of their own.
  const rows = (data ?? []).filter((row) => !kind || row.kind === kind);
  const hits = rows.filter((row) => !row.related);
  const related = rows.filter((row) => row.related);
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={props.filtering ? undefined : setQuery}
      filtering={props.filtering}
      throttle
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder={props.placeholder}
      searchBarAccessory={
        <List.Dropdown tooltip="Kind" storeValue onChange={setKind}>
          {kinds.map((k) => (
            <List.Dropdown.Item key={k.value} value={k.value} title={k.title} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Anycap did not answer" description={error.message} />
      ) : (
        <List.EmptyView icon={Icon.Tray} title={props.emptyTitle(query)} />
      )}
      <List.Section title={query ? "Results" : undefined}>
        {hits.map((row) => (
          <CaptureItem key={row.id} row={row} onChange={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Related by Meaning">
        {related.map((row) => (
          <CaptureItem key={`related-${row.id}`} row={row} onChange={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function CaptureItem(props: { row: CaptureRow; onChange: () => void }) {
  const { row } = props;
  return (
    <List.Item
      icon={
        row.url
          ? {
              source: `https://www.google.com/s2/favicons?sz=64&domain=${host(row.url)}`,
              fallback: kindIcon[row.kind] ?? Icon.Circle,
            }
          : (kindIcon[row.kind] ?? Icon.Circle)
      }
      title={row.title}
      subtitle={row.subtitle}
      keywords={[row.kind, host(row.url) ?? ""]}
      accessories={[{ text: host(row.url) ?? row.kind }]}
      actions={<CaptureActions row={row} onChange={props.onChange} />}
    />
  );
}

export function CaptureActions(props: { row: CaptureRow; onChange?: () => void; inDetail?: boolean }) {
  const { row } = props;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {row.url ? <Action.OpenInBrowser url={row.url} /> : null}
        <Action
          title="Open in Anycap"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => openInAnycap(row.id)}
        />
        {props.inDetail ? null : (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            target={<CaptureDetail row={row} />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {row.url ? (
          <Action.CopyToClipboard title="Copy URL" content={row.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
        {row.url ? (
          <Action.CopyToClipboard
            title="Copy Markdown Link"
            content={`[${row.title}](${row.url})`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        ) : null}
        <Action.CopyToClipboard
          title="Copy Anycap Link"
          content={deepLink(row.id)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <MoveAction row={row} onChange={props.onChange} />
        <Action
          title="Archive"
          icon={Icon.Tray}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const toast = await showToast({ style: Toast.Style.Animated, title: "Archiving" });
            try {
              const reply = await callTool("archive", { id: row.id });
              if (reply.startsWith("No item")) throw new Error(reply);
              toast.style = Toast.Style.Success;
              toast.title = "Archived";
              toast.primaryAction = {
                title: "Undo",
                onAction: async () => {
                  await callTool("archive", { id: row.id, restore: true });
                  props.onChange?.();
                },
              };
              props.onChange?.();
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Could not archive";
              toast.message = error instanceof Error ? error.message : String(error);
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function MoveAction(props: { row: CaptureRow; onChange?: () => void }) {
  const { data } = useCachedPromise(async () => parseFolders(await callTool("categories", {})), [], {
    keepPreviousData: true,
  });
  const folders: Folder[] = data ?? [];
  return (
    <ActionPanel.Submenu title="Move to Folder" icon={Icon.Folder} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}>
      {folders.map((folder) => (
        <Action
          key={folder.name}
          title={folder.name}
          icon={folder.emoji ?? Icon.Folder}
          onAction={async () => {
            try {
              const reply = await callTool("move", { id: props.row.id, category: folder.name });
              if (reply.startsWith("No ")) throw new Error(reply);
              await showToast({ style: Toast.Style.Success, title: `Moved to ${folder.name}` });
              props.onChange?.();
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not move",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/// The capture as Anycap describes it: what it is, where it is filed, and
/// (with Pro) its text, excerpt and summary. Its whole text opens in Anycap.
export function CaptureDetail(props: { row: CaptureRow }) {
  const { row } = props;
  const { data, isLoading } = useCachedPromise(loadDetail, [row.id]);
  const fields = data?.fields ?? {};
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={row.title}
      markdown={data?.markdown ?? `# ${row.title}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Kind">
            <Detail.Metadata.TagList.Item text={row.kind} color={Color.SecondaryText} />
          </Detail.Metadata.TagList>
          {fields.category ? <Detail.Metadata.Label title="Folder" text={fields.category} icon={Icon.Folder} /> : null}
          {fields.author ? <Detail.Metadata.Label title="Author" text={fields.author} icon={Icon.Person} /> : null}
          {fields.dimensions ? <Detail.Metadata.Label title="Dimensions" text={fields.dimensions} /> : null}
          {fields.created ? (
            <Detail.Metadata.Label title="Captured" text={new Date(fields.created).toLocaleString()} />
          ) : null}
          {fields.updated ? (
            <Detail.Metadata.Label title="Modified" text={new Date(fields.updated).toLocaleString()} />
          ) : null}
          {fields.archived ? (
            <Detail.Metadata.Label title="Archived" text={new Date(fields.archived).toLocaleString()} />
          ) : null}
          {data?.tags.length ? (
            <Detail.Metadata.TagList title="Tags">
              {data.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {row.url ? <Detail.Metadata.Link title="Source" target={row.url} text={host(row.url) ?? row.url} /> : null}
        </Detail.Metadata>
      }
      actions={<CaptureActions row={row} inDetail />}
    />
  );
}
