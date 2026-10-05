import { useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { getFavicon, showFailureToast, useCachedPromise } from "@raycast/utils";
import { remove, search, searchLimit } from "./capd";
import { CapdNotInstalled } from "./contract";
import { Capture, Hit, headline, tagList } from "./types";

const INSTALL_GUIDE = "https://capd.jxd.dev/install";
const PLACEHOLDER = "swift concurrency site:swift.org tag:development after:2026-01-01";
const COPY_TITLE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "t" };
const COPY_MARKDOWN_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "m" };

export default function Command() {
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController>(null);

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    (text: string, limit: number) => search(text, limit, abortable.current?.signal),
    [query, searchLimit()],
    {
      abortable,
      keepPreviousData: true,
      initialData: [] as Hit[],
      onError: (searchError) => {
        if (searchError instanceof CapdNotInstalled) {
          return;
        }
        showFailureToast(searchError, { title: "Could not search Capd" });
      },
    },
  );

  if (error instanceof CapdNotInstalled) {
    return <NotInstalled />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={PLACEHOLDER}
      throttle
    >
      {isLoading || error ? null : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query ? "No matching captures" : "Nothing captured yet"}
          description={
            query
              ? "Try fewer words, or drop a site: or tag: filter."
              : "Use the Capture command to save a link, selection, or the clipboard."
          }
        />
      )}
      {(data ?? []).map((hit) => (
        <List.Item
          key={hit.capture.id}
          icon={icon(hit.capture)}
          title={headline(hit.capture)}
          subtitle={hit.snippet}
          accessories={accessories(hit.capture)}
          actions={
            <Actions
              hit={hit}
              onRemoved={async (id) => {
                await mutate(remove([id]), {
                  optimisticUpdate: (current) => (current ?? []).filter((item) => item.capture.id !== id),
                });
              }}
              onReload={revalidate}
            />
          }
        />
      ))}
    </List>
  );
}

function Actions({
  hit,
  onRemoved,
  onReload,
}: {
  hit: Hit;
  onRemoved: (id: number) => Promise<void>;
  onReload: () => void;
}) {
  const { capture } = hit;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {capture.url ? <Action.OpenInBrowser url={capture.url} /> : null}
        {capture.url ? (
          <Action.CopyToClipboard title="Copy URL" content={capture.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
        {capture.title ? (
          <Action.CopyToClipboard title="Copy Title" content={capture.title} shortcut={COPY_TITLE_SHORTCUT} />
        ) : null}
        <Action.CopyToClipboard
          title="Copy as Markdown"
          content={markdown(capture)}
          shortcut={COPY_MARKDOWN_SHORTCUT}
        />
        {capture.selection ? <Action.CopyToClipboard title="Copy Selection" content={capture.selection} /> : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onReload}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
        <Action
          title="Delete Capture"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete this capture?",
              message: headline(capture),
              icon: Icon.Trash,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) {
              return;
            }
            try {
              await onRemoved(capture.id);
              await showToast({
                style: Toast.Style.Success,
                title: `Deleted #${capture.id}`,
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not delete capture",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function NotInstalled() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Capd isn't installed"
        description="Install Capd, or set the path to the capd binary in this extension's preferences."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Installation Guide" url={INSTALL_GUIDE} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function icon(capture: Capture) {
  if (capture.kind === "image") {
    return Icon.Image;
  }
  if (capture.kind === "text") {
    return Icon.Text;
  }
  return capture.url ? getFavicon(capture.url, { fallback: Icon.Link }) : Icon.Link;
}

function accessories(capture: Capture): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  const tags = tagList(capture);
  if (tags.length > 0) {
    accessories.push({ tag: { value: tags[0], color: Color.SecondaryText } });
  }
  if (capture.note) {
    accessories.push({ icon: Icon.Pencil, tooltip: capture.note });
  }
  if (capture.seen_count > 1) {
    accessories.push({
      text: `${capture.seen_count}×`,
      tooltip: `Seen ${capture.seen_count} times`,
    });
  }
  if (capture.host) {
    accessories.push({ text: capture.host });
  }
  accessories.push({
    date: new Date(capture.created_at),
    tooltip: new Date(capture.created_at).toLocaleString(),
  });

  return accessories;
}

function markdown(capture: Capture): string {
  const title = headline(capture);
  return capture.url ? `[${title}](${capture.url})` : title;
}
