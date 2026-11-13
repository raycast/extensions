import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { FetchedPages, PageDetail } from "./components/fetched-pages";
import { ExportForm } from "./components/export-form";
import { formatPage, hostname } from "./content";
import { library } from "./library";
import { getReadingRefreshOptions, type ReadingItem } from "./library-store";

export default function ReadingList() {
  const [filter, setFilter] = useState("all");
  const { push } = useNavigation();
  const { data = [], isLoading, revalidate } = usePromise(library.listReading);
  async function update(action: () => Promise<void>) {
    try {
      await action();
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not update reading list" });
    }
  }
  async function read(item: ReadingItem) {
    if (item.snapshot) {
      await update(() => library.markRead(item.id, true));
      push(
        <PageDetail page={item.snapshot.page} options={item.snapshot.options} savedAt={item.snapshot.fetchedAt} />,
        () => void revalidate(),
      );
    } else {
      push(
        <FetchedPages
          options={{ urls: [item.url], links: true }}
          saveToReadingList
          onFetched={() => update(() => library.markRead(item.id, true))}
        />,
        () => void revalidate(),
      );
    }
  }
  const visible = data.filter(
    (item) =>
      filter === "all" || (filter === "unread" ? !item.read : filter === "read" ? item.read : Boolean(item.snapshot)),
  );
  const downloaded = data.flatMap((item) => (item.snapshot ? [formatPage(item.snapshot.page)] : []));
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Find saved pages…"
      searchBarAccessory={
        <List.Dropdown tooltip="Reading Status" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Pages" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="Read" value="read" />
          <List.Dropdown.Item title="Available Offline" value="offline" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={data.length ? "No pages match this filter" : "Your reading list is empty"}
        description="Save a search result or fetched page to read it later."
        icon={Icon.Bookmark}
      />
      {visible.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={hostname(item.url)}
          icon={item.read ? Icon.CheckCircle : Icon.Bookmark}
          accessories={[{ text: item.snapshot ? "Offline" : "Link" }]}
          detail={
            <List.Item.Detail
              markdown={
                item.snapshot
                  ? formatPage(item.snapshot.page)
                  : `# ${item.title}\n\n${item.url}\n\nFetch this page to save its content for offline reading.`
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title={item.snapshot ? "Read Saved Content" : "Fetch and Save Content"}
                icon={Icon.Document}
                onAction={() => read(item)}
              />
              <Action
                title={item.read ? "Mark as Unread" : "Mark as Read"}
                icon={Icon.CheckCircle}
                onAction={() => update(() => library.markRead(item.id, !item.read))}
              />
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard title="Copy URL" content={item.url} />
              {item.snapshot ? (
                <Action.Push
                  title="Export Markdown"
                  icon={Icon.Download}
                  target={<ExportForm title={item.title} markdown={formatPage(item.snapshot.page)} />}
                />
              ) : null}
              {downloaded.length ? (
                <Action.Push
                  title="Export All Saved Content"
                  icon={Icon.Download}
                  target={<ExportForm title="TinyFish Reading List" markdown={downloaded.join("\n\n---\n\n")} />}
                />
              ) : null}
              <Action.Push
                title="Refresh Saved Content"
                icon={Icon.ArrowClockwise}
                target={<FetchedPages options={getReadingRefreshOptions(item)} saveToReadingList />}
                onPop={() => void revalidate()}
              />
              <Action title="Refresh List" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
              <Action
                title="Remove from Reading List"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => update(() => library.removeReading(item.id))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
