import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import {
  ApiError,
  ArticleChanges,
  articleUrl,
  deleteArticle,
  downloadEpub,
  listArticles,
  listFolders,
  listHighlights,
  listTags,
  searchArticles,
  updateArticle,
} from "./lib/api";
import { HighlightsList } from "./highlights";
import {
  displayTitle,
  fraction,
  markdownLink,
  matchesFilter,
  parseTags,
  quoteText,
  readingTime,
  snippetMarkdown,
  splitFilter,
} from "./lib/logic";
import { run } from "./lib/no-view";
import { useSession, withSession } from "./lib/session";
import type { Article, Folder, Highlight, Tag } from "./lib/types";
import { articleIcon } from "./lib/views";

const DEFAULT_FILTER = "state:unread";

// As a fallback command, what was typed in Raycast's root search is searched for.
function Library(props: LaunchProps) {
  const { report } = useSession();
  const [filter, setFilter] = useCachedState("library-filter", DEFAULT_FILTER);
  const [showDetail, setShowDetail] = useCachedState("library-detail", true);
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [selectedId, setSelectedId] = useState<number>();
  const query = searchText.trim();

  const { data: folders = [] } = useCachedPromise(listFolders, [], {
    onError: () => {},
  });
  const { data: tags = [] } = useCachedPromise(listTags, [], {
    onError: () => {},
  });

  const {
    data: fetched = [],
    isLoading,
    pagination,
    revalidate,
  } = useCachedPromise(
    (query: string, filter: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const [kind, value] = splitFilter(filter);
        const page = query
          ? await searchArticles(query, { cursor })
          : await listArticles({
              state: kind === "state" ? value : undefined,
              folderId: kind === "folder" ? value : undefined,
              tag: kind === "tag" ? value : undefined,
              cursor,
            });
        return { data: page.articles, hasMore: Boolean(page.next_cursor), cursor: page.next_cursor ?? undefined };
      },
    [query, filter],
    {
      keepPreviousData: true,
      onError: (error) => {
        // The folder this list was last left on is gone.
        if (error instanceof ApiError && error.status === 404 && filter !== DEFAULT_FILTER) setFilter(DEFAULT_FILTER);
        else report(error, "Could not load your library");
      },
    },
  );

  // Changes made here, by article id (null for a deleted one), laid over
  // what the server last sent. They show at once, stay put while more pages
  // load, and are dropped when the list is fetched again.
  const [changes, setChanges] = useState<Record<number, Article | null>>({});
  const override = (id: number, article: Article | null | undefined) =>
    setChanges((current) => {
      const next = { ...current };
      if (article === undefined) delete next[id];
      else next[id] = article;
      return next;
    });
  const articles = fetched
    .filter((article) => changes[article.id] !== null)
    .map((article) => changes[article.id] ?? article)
    .filter((article) => Boolean(query) || matchesFilter(article, filter));

  function refresh() {
    setChanges({});
    revalidate();
  }

  const selected = articles.find((article) => article.id === selectedId);
  const { data: highlights } = useCachedPromise(listHighlights, [selectedId ?? 0], {
    execute: showDetail && Boolean(selected?.highlights_count),
    keepPreviousData: false,
    onError: () => {},
  });

  async function change(article: Article, changed: ArticleChanges, done: string) {
    override(article.id, { ...article, ...changed });
    try {
      const saved = await updateArticle(article.id, changed);
      override(article.id, { ...article, ...saved });
      await showToast({ style: Toast.Style.Success, title: done, message: displayTitle(article) });
    } catch (error) {
      override(article.id, undefined);
      report(error, "Could not update the article");
    }
  }

  async function remove(article: Article) {
    const confirmed = await confirmAlert({
      title: "Delete this article?",
      message: `"${displayTitle(article)}" and its highlights are removed from Texthyper on every device.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    override(article.id, null);
    try {
      await deleteArticle(article.id);
      await showToast({ style: Toast.Style.Success, title: "Deleted", message: displayTitle(article) });
    } catch (error) {
      override(article.id, undefined);
      report(error, "Could not delete the article");
    }
  }

  const actions = { change, remove, refresh, report, folders, tags };
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && articles.length > 0}
      filtering={false}
      throttle
      pagination={pagination}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id ? Number(id) : undefined)}
      searchBarPlaceholder="Search titles, authors and the full text"
      searchBarAccessory={<FilterDropdown filter={filter} onChange={setFilter} folders={folders} tags={tags} />}
    >
      <List.EmptyView
        icon={query ? Icon.MagnifyingGlass : Icon.Book}
        title={query ? "Nothing found" : "Nothing here yet"}
        description={
          query
            ? "Search looks through everything you saved, the archive included."
            : "Save a page with the Save to Texthyper command."
        }
      />
      {articles.map((article) => (
        <List.Item
          key={article.id}
          id={String(article.id)}
          icon={articleIcon(article)}
          title={displayTitle(article)}
          subtitle={showDetail ? undefined : (article.site_name ?? article.domain ?? undefined)}
          accessories={showDetail ? listAccessories(article).slice(0, 1) : listAccessories(article)}
          detail={
            <ArticleDetail
              article={article}
              folder={article.folder_id ? folderNames.get(article.folder_id) : undefined}
              highlights={article.id === selectedId ? highlights : undefined}
            />
          }
          actions={
            <ArticleActions
              article={article}
              {...actions}
              showDetail={showDetail}
              onToggleDetail={() => setShowDetail(!showDetail)}
            />
          }
        />
      ))}
    </List>
  );
}

function FilterDropdown(props: { filter: string; onChange: (filter: string) => void; folders: Folder[]; tags: Tag[] }) {
  return (
    <List.Dropdown tooltip="Show" value={props.filter} onChange={props.onChange}>
      <List.Dropdown.Item title="Unread" value="state:unread" icon={Icon.Book} />
      <List.Dropdown.Item title="Liked" value="state:liked" icon={Icon.Heart} />
      <List.Dropdown.Item title="Archive" value="state:archived" icon={Icon.Tray} />
      <List.Dropdown.Item title="Everything" value="state:all" icon={Icon.List} />
      {props.folders.length > 0 && (
        <List.Dropdown.Section title="Folders">
          {props.folders.map((folder) => (
            <List.Dropdown.Item key={folder.id} title={folder.name} value={`folder:${folder.id}`} icon={Icon.Folder} />
          ))}
        </List.Dropdown.Section>
      )}
      {props.tags.length > 0 && (
        <List.Dropdown.Section title="Tags">
          {props.tags.map((tag) => (
            <List.Dropdown.Item key={tag.id} title={tag.name} value={`tag:${tag.name}`} icon={Icon.Tag} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}

function listAccessories(article: Article): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (article.status === "failed") {
    accessories.push({ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: "Could not be extracted" });
  } else if (article.status === "pending") {
    accessories.push({ icon: Icon.Clock, tooltip: "Being extracted" });
  } else if (article.reading_time) {
    accessories.push({ text: readingTime(article.reading_time), tooltip: "Reading time" });
  }
  const read = fraction(article);
  if (read >= 0.02)
    accessories.push({ icon: Icon.CircleProgress, text: `${Math.round(read * 100)}%`, tooltip: "Read" });
  if (article.highlights_count > 0) {
    accessories.push({ icon: Icon.Highlight, text: String(article.highlights_count), tooltip: "Highlights" });
  }
  if (article.liked) accessories.push({ icon: { source: Icon.Heart, tintColor: Color.Red }, tooltip: "Liked" });
  for (const tag of article.tags.slice(0, 2)) accessories.push({ tag });
  accessories.push({ date: new Date(article.saved_at), tooltip: "Saved" });
  return accessories;
}

function ArticleDetail(props: { article: Article; folder?: string; highlights?: Highlight[] }) {
  const { article, highlights } = props;
  const parts = [`## ${displayTitle(article)}`];
  if (article.status === "failed") {
    parts.push(`*Could not be extracted${article.error_message ? `: ${article.error_message}` : ""}.*`);
  }
  if (article.snippet) parts.push(snippetMarkdown(article.snippet));
  else if (article.excerpt) parts.push(article.excerpt);
  for (const highlight of highlights ?? []) {
    parts.push(`> ${quoteText(highlight)}${highlight.comment ? `\n>\n> *${highlight.comment.trim()}*` : ""}`);
  }

  const read = fraction(article);
  const length = [
    readingTime(article.reading_time),
    article.word_count ? `${article.word_count.toLocaleString()} words` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const Metadata = List.Item.Detail.Metadata;

  return (
    <List.Item.Detail
      markdown={parts.join("\n\n")}
      metadata={
        <Metadata>
          <Metadata.Link title="Site" text={article.site_name || article.domain || article.url} target={article.url} />
          {article.author && <Metadata.Label title="Author" text={article.author} />}
          {length && <Metadata.Label title="Length" text={length} />}
          {read >= 0.02 && <Metadata.Label title="Read" text={`${Math.round(read * 100)}%`} />}
          <Metadata.Label title="Saved" text={new Date(article.saved_at).toLocaleDateString()} />
          {article.published_at && (
            <Metadata.Label title="Published" text={new Date(article.published_at).toLocaleDateString()} />
          )}
          {props.folder && <Metadata.Label title="Folder" text={props.folder} icon={Icon.Folder} />}
          {article.tags.length > 0 && (
            <Metadata.TagList title="Tags">
              {article.tags.map((tag) => (
                <Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Metadata.TagList>
          )}
          {article.highlights_count > 0 && (
            <Metadata.Label title="Highlights" text={String(article.highlights_count)} icon={Icon.Highlight} />
          )}
        </Metadata>
      }
    />
  );
}

type ActionsProps = {
  article: Article;
  change: (article: Article, changes: ArticleChanges, done: string) => Promise<void>;
  remove: (article: Article) => Promise<void>;
  refresh: () => void;
  report: (error: unknown, title?: string) => void;
  folders: Folder[];
  tags: Tag[];
  showDetail: boolean;
  onToggleDetail: () => void;
};

function ArticleActions(props: ActionsProps) {
  const { article, change, folders } = props;
  const { openIn } = getPreferenceValues<Preferences>();
  const inTexthyper = (
    <Action.OpenInBrowser key="texthyper" title="Open in Texthyper" icon={Icon.Book} url={articleUrl(article)} />
  );
  const original = <Action.OpenInBrowser key="original" title="Open Original" url={article.url} />;

  async function epub() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading EPUB" });
    try {
      const path = await downloadEpub(article);
      toast.style = Toast.Style.Success;
      toast.title = "EPUB saved to Downloads";
      toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
    } catch (error) {
      toast.hide();
      props.report(error, "Could not download the EPUB");
    }
  }

  return (
    <ActionPanel title={displayTitle(article)}>
      <ActionPanel.Section>
        {openIn === "original" ? [original, inTexthyper] : [inTexthyper, original]}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={article.archived ? "Move Back to Unread" : "Archive"}
          icon={article.archived ? Icon.ArrowCounterClockwise : Icon.Tray}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={() =>
            change(article, { archived: !article.archived }, article.archived ? "Moved to Unread" : "Archived")
          }
        />
        <Action
          title={article.liked ? "Unlike" : "Like"}
          icon={article.liked ? Icon.HeartDisabled : Icon.Heart}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => change(article, { liked: !article.liked }, article.liked ? "Unliked" : "Liked")}
        />
        <ActionPanel.Submenu
          title="Move to Folder"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        >
          {folders.map((folder) => (
            <Action
              key={folder.id}
              title={folder.name}
              icon={folder.id === article.folder_id ? Icon.CheckCircle : Icon.Folder}
              onAction={() => change(article, { folder_id: folder.id }, `Moved to ${folder.name}`)}
            />
          ))}
          <Action
            title="No Folder"
            icon={article.folder_id ? Icon.XMarkCircle : Icon.CheckCircle}
            onAction={() => change(article, { folder_id: null }, "Removed from its folder")}
          />
        </ActionPanel.Submenu>
        <Action.Push
          title="Edit Tags"
          icon={Icon.Tag}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<TagsForm article={article} tags={props.tags} change={change} />}
        />
        {article.highlights_count > 0 && (
          <Action.Push
            title="Show Highlights"
            icon={Icon.Highlight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            target={<HighlightsList articleId={article.id} />}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={article.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={markdownLink(article)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action
          title="Download EPUB"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={epub}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={props.showDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={props.onToggleDetail}
        />
        <Action
          title="Save a Page"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => run("save")}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={props.refresh}
        />
        <Action
          title="Delete"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => props.remove(article)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function TagsForm(props: { article: Article; tags: Tag[]; change: ActionsProps["change"] }) {
  const { article } = props;
  const { pop } = useNavigation();
  const known = [...new Set([...props.tags.map((tag) => tag.name), ...article.tags])].sort((a, b) =>
    a.localeCompare(b),
  );

  async function submit(values: { tags: string[]; added: string }) {
    const tags = [...new Set([...values.tags, ...parseTags(values.added)])];
    pop();
    await props.change(article, { tags }, tags.length ? `Tagged ${tags.join(", ")}` : "Tags removed");
  }

  return (
    <Form
      navigationTitle={displayTitle(article)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tags" icon={Icon.Tag} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="tags" title="Tags" defaultValue={article.tags}>
        {known.map((name) => (
          <Form.TagPicker.Item key={name} value={name} title={name} icon={Icon.Tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField id="added" title="New Tags" placeholder="design, to cite" info="Separate several with commas." />
    </Form>
  );
}

export default withSession(Library);
