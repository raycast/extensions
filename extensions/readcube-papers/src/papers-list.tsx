import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { AuthError, doiUrl, getItems, Item, itemUrl, pdfUrl } from "./api";
import { formatAuthors, formatCitation } from "./citation";

interface PapersListProps {
  collectionId?: string;
  listId?: string;
  navigationTitle?: string;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isLoadingContext?: boolean;
  contextError?: Error;
}

export function PapersList(props: PapersListProps) {
  const { collectionId, listId, navigationTitle, searchBarAccessory, isLoadingContext, contextError } = props;
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-detail", false);

  const { data, isLoading, pagination, error } = useCachedPromise(
    (collectionId: string, listId: string | undefined, query: string) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const page = await getItems({ collectionId, listId, query, scrollId: cursor });
        return { data: page.items, hasMore: Boolean(page.scrollId), cursor: page.scrollId };
      },
    [collectionId ?? "", listId, searchText],
    { execute: Boolean(collectionId), keepPreviousData: true },
  );

  const shownError = contextError ?? error;

  return (
    <List
      isLoading={isLoading || isLoadingContext}
      pagination={pagination}
      isShowingDetail={isShowingDetail && (data?.length ?? 0) > 0}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search title, author, journal, DOI…"
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={searchBarAccessory}
    >
      {shownError ? (
        <ErrorView error={shownError} title="Couldn't Load Papers" />
      ) : (
        data?.map((item) => (
          <PaperItem
            key={item.id}
            item={item}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((value) => !value)}
          />
        ))
      )}
      {!shownError && !isLoading && data?.length === 0 && (
        <List.EmptyView
          icon={Icon.Document}
          title={searchText ? "No Matching Papers" : "No Papers"}
          description={searchText ? `Nothing matches "${searchText}"` : undefined}
        />
      )}
    </List>
  );
}

export function ErrorView({ error, title }: { error: Error; title: string }) {
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title={error instanceof AuthError ? "Can't Sign In to ReadCube" : title}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function PaperItem(props: { item: Item; isShowingDetail: boolean; onToggleDetail: () => void }) {
  const { item, isShowingDetail, onToggleDetail } = props;
  const { title, authors, journal, journal_abbrev, year } = item.article;
  const hasPdf = Boolean(item.files?.length);

  const accessories: List.Item.Accessory[] = isShowingDetail
    ? []
    : [
        ...(item.user_data.star ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Starred" }] : []),
        ...(journal_abbrev || journal ? [{ text: journal_abbrev || journal, tooltip: journal }] : []),
        ...(year ? [{ text: String(year) }] : []),
      ];

  return (
    <List.Item
      title={title || "Untitled"}
      subtitle={isShowingDetail ? undefined : formatAuthors(authors)}
      icon={hasPdf ? { source: Icon.Document, tintColor: Color.Red } : Icon.Document}
      accessories={accessories}
      keywords={[...(authors ?? []), journal ?? "", item.ext_ids.doi ?? ""]}
      detail={<PaperDetail item={item} />}
      actions={<PaperActions item={item} onToggleDetail={onToggleDetail} />}
    />
  );
}

function PaperDetail({ item }: { item: Item }) {
  const { title, authors, journal, year, volume, issue, pagination, abstract } = item.article;
  const markdown = [`## ${title || "Untitled"}`, abstract ? abstract : "_No abstract._"].join("\n\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {authors?.length ? (
            <List.Item.Detail.Metadata.Label title="Authors" text={formatAuthors(authors, 8)} />
          ) : null}
          {journal ? <List.Item.Detail.Metadata.Label title="Journal" text={journal} /> : null}
          {year ? <List.Item.Detail.Metadata.Label title="Year" text={String(year)} /> : null}
          {volume ? (
            <List.Item.Detail.Metadata.Label
              title="Volume"
              text={`${volume}${issue ? ` (${issue})` : ""}${pagination ? `, ${pagination}` : ""}`}
            />
          ) : null}
          {item.ext_ids.doi ? (
            <List.Item.Detail.Metadata.Link title="DOI" text={item.ext_ids.doi} target={doiUrl(item)!} />
          ) : null}
          {item.user_data.citekey ? (
            <List.Item.Detail.Metadata.Label title="Citekey" text={item.user_data.citekey} />
          ) : null}
          {item.user_data.tags?.length ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {item.user_data.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Label title="PDF" text={item.files?.length ? "Attached" : "None"} />
          {item.user_data.created ? (
            <List.Item.Detail.Metadata.Label
              title="Added"
              text={new Date(item.user_data.created).toLocaleDateString()}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PaperActions({ item, onToggleDetail }: { item: Item; onToggleDetail: () => void }) {
  const pdf = pdfUrl(item);
  const doi = doiUrl(item);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in ReadCube" url={itemUrl(item)} />
        {/* Raycast binds the first two actions itself, so only later ones get custom shortcuts. */}
        {pdf && <Action.OpenInBrowser title="Open PDF in ReadCube" icon={Icon.Document} url={pdf} />}
        {doi && (
          <Action.OpenInBrowser
            title="Open DOI Link"
            icon={Icon.Globe}
            url={doi}
            shortcut={pdf ? Keyboard.Shortcut.Common.OpenWith : undefined}
          />
        )}
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={pdf || doi ? { modifiers: ["cmd"], key: "d" } : undefined}
          onAction={onToggleDetail}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Citation"
          content={formatCitation(item)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {item.ext_ids.doi && (
          <Action.CopyToClipboard
            title="Copy DOI"
            content={item.ext_ids.doi}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        {item.user_data.citekey && (
          <Action.CopyToClipboard
            title="Copy Citekey"
            content={item.user_data.citekey}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
        <Action.CopyToClipboard
          title="Copy ReadCube Link"
          content={itemUrl(item)}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
        {item.article.title && <Action.CopyToClipboard title="Copy Title" content={item.article.title} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
