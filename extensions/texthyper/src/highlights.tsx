import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { articleUrl, CardSize, deleteHighlight, downloadCard, updateHighlight } from "./lib/api";
import { displayTitle, highlightMarkdown, quoteText, textFragmentUrl } from "./lib/logic";
import { useSession, withSession } from "./lib/session";
import type { Article, Highlight, HighlightColor } from "./lib/types";
import { HIGHLIGHT_COLORS, LoadFailed, useLibrary } from "./lib/views";

type Changes = { color?: HighlightColor; comment?: string | null };

// Every highlight in the library, newest first, or one article's when the
// Library command pushes this for an article.
function Highlights({ articleId }: { articleId?: number }) {
  const { report } = useSession();
  const { library, isLoading, error, refresh, update } = useLibrary(report);
  const [filter, setFilter] = useState("all");

  const all = Object.values(library?.highlights ?? {})
    .filter((highlight) => !articleId || highlight.article_id === articleId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const highlights = all.filter((highlight) => {
    if (filter === "all") return true;
    if (filter === "notes") return Boolean(highlight.comment?.trim());
    return highlight.color === filter;
  });

  async function change(highlight: Highlight, changes: Changes, done: string) {
    try {
      const saved = await updateHighlight(highlight.id, changes);
      await update((current) => ({ ...current, highlights: { ...current.highlights, [saved.id]: saved } }));
      await showToast({ style: Toast.Style.Success, title: done });
      return true;
    } catch (error) {
      report(error, "Could not update the highlight");
      return false;
    }
  }

  async function remove(highlight: Highlight) {
    const confirmed = await confirmAlert({
      title: "Delete this highlight?",
      message: "It is removed from the article on every device.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteHighlight(highlight.id);
      await update((current) => {
        const rest = { ...current.highlights };
        delete rest[highlight.id];
        return { ...current, highlights: rest };
      });
      await showToast({ style: Toast.Style.Success, title: "Highlight deleted" });
    } catch (error) {
      report(error, "Could not delete the highlight");
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={highlights.length > 0}
      navigationTitle={
        articleId && library?.articles[articleId] ? displayTitle(library.articles[articleId]) : undefined
      }
      searchBarPlaceholder="Search quotes, notes, titles and authors"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Highlights" value="all" icon={Icon.Highlight} />
          <List.Dropdown.Item title="With a Note" value="notes" icon={Icon.SpeechBubble} />
          <List.Dropdown.Section title="Color">
            {Object.entries(HIGHLIGHT_COLORS).map(([value, { name, color }]) => (
              <List.Dropdown.Item
                key={value}
                title={name}
                value={value}
                icon={{ source: Icon.CircleFilled, tintColor: color }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && all.length === 0 ? (
        <LoadFailed error={error} onRetry={refresh} />
      ) : (
        <List.EmptyView
          icon={Icon.Highlight}
          title={all.length === 0 ? "No highlights yet" : "No highlights like that"}
          description={all.length === 0 ? "Select a passage while reading in Texthyper to highlight it." : undefined}
        />
      )}
      {highlights.map((highlight) => {
        const article = library?.articles[highlight.article_id];
        return (
          <List.Item
            key={highlight.id}
            icon={{ source: Icon.CircleFilled, tintColor: HIGHLIGHT_COLORS[highlight.color]?.color }}
            title={quoteText(highlight) || "(empty highlight)"}
            keywords={keywords(highlight, article)}
            detail={<HighlightDetail highlight={highlight} article={article} />}
            actions={
              <HighlightActions
                highlight={highlight}
                article={article}
                change={change}
                remove={remove}
                refresh={refresh}
                report={report}
              />
            }
          />
        );
      })}
    </List>
  );
}

// What typing in the search bar matches besides the quote itself.
function keywords(highlight: Highlight, article?: Article): string[] {
  const text = [highlight.comment, article?.title, article?.author, article?.site_name, article?.domain]
    .filter(Boolean)
    .join(" ");
  return [...new Set([...text.split(/[^\p{L}\p{N}]+/u), ...(article?.tags ?? [])])].filter((word) => word.length > 1);
}

function HighlightDetail({ highlight, article }: { highlight: Highlight; article?: Article }) {
  const parts = [`> ${quoteText(highlight)}`];
  if (highlight.comment?.trim()) parts.push(highlight.comment.trim());
  const Metadata = List.Item.Detail.Metadata;

  return (
    <List.Item.Detail
      markdown={parts.join("\n\n")}
      metadata={
        <Metadata>
          {article && <Metadata.Link title="Article" text={displayTitle(article)} target={articleUrl(article)} />}
          {article?.author && <Metadata.Label title="Author" text={article.author} />}
          {article && (
            <Metadata.Link
              title="Site"
              text={article.site_name || article.domain || article.url}
              target={article.url}
            />
          )}
          <Metadata.Label title="Highlighted" text={new Date(highlight.created_at).toLocaleDateString()} />
          {article && article.tags.length > 0 && (
            <Metadata.TagList title="Tags">
              {article.tags.map((tag) => (
                <Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Metadata.TagList>
          )}
        </Metadata>
      }
    />
  );
}

type ActionsProps = {
  highlight: Highlight;
  article?: Article;
  change: (highlight: Highlight, changes: Changes, done: string) => Promise<boolean>;
  remove: (highlight: Highlight) => Promise<void>;
  refresh: () => void;
  report: (error: unknown, title?: string) => void;
};

function HighlightActions({ highlight, article, change, remove, refresh, report }: ActionsProps) {
  const quote = quoteText(highlight);

  async function copyCard(size: CardSize) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Making the quote card" });
    try {
      const file = await downloadCard(highlight.id, size);
      await Clipboard.copy({ file });
      await toast.hide();
      await showHUD("Quote card copied");
    } catch (error) {
      await toast.hide();
      report(error, "Could not make the quote card");
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Quote" content={quote} />
        <Action.Paste title="Paste Quote" content={quote} />
        <Action.CopyToClipboard
          title="Copy as Markdown"
          content={highlightMarkdown(highlight, article)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <ActionPanel.Submenu
          title="Copy Quote Card"
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        >
          <Action title="Square" icon={Icon.Image} onAction={() => copyCard("square")} />
          <Action title="Story" icon={Icon.Mobile} onAction={() => copyCard("story")} />
          <Action title="Wide" icon={Icon.Monitor} onAction={() => copyCard("wide")} />
        </ActionPanel.Submenu>
      </ActionPanel.Section>

      {article && (
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Article in Texthyper"
            icon={Icon.Book}
            url={articleUrl(article)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.OpenInBrowser
            title="Open Original at the Quote"
            url={textFragmentUrl(article.url, quote)}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action.Push
          title={highlight.comment?.trim() ? "Edit Note" : "Add a Note"}
          icon={Icon.SpeechBubble}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<NoteForm highlight={highlight} change={change} />}
        />
        <ActionPanel.Submenu title="Change Color" icon={Icon.Brush}>
          {Object.entries(HIGHLIGHT_COLORS).map(([value, { name, color }]) => (
            <Action
              key={value}
              title={name}
              icon={{ source: value === highlight.color ? Icon.CheckCircle : Icon.CircleFilled, tintColor: color }}
              onAction={() => change(highlight, { color: value as HighlightColor }, `Now ${name.toLowerCase()}`)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
        <Action
          title="Delete Highlight"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => remove(highlight)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function NoteForm({ highlight, change }: { highlight: Highlight; change: ActionsProps["change"] }) {
  const { pop } = useNavigation();

  async function submit(values: { comment: string }) {
    const comment = values.comment.trim();
    if (await change(highlight, { comment: comment || null }, comment ? "Note saved" : "Note removed")) pop();
  }

  return (
    <Form
      navigationTitle="Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" icon={Icon.SpeechBubble} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Highlight" text={quoteText(highlight)} />
      <Form.TextArea
        id="comment"
        title="Note"
        placeholder="What this passage made you think"
        defaultValue={highlight.comment ?? ""}
        autoFocus
      />
    </Form>
  );
}

// Pushed views don't inherit the pushing command's context, so the list
// carries its own session.
export const HighlightsList = withSession(Highlights);

export default HighlightsList;
