import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  closeMainWindow,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { executeSQL, usePromise, useSQL } from "@raycast/utils";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { textStatistics, type TextStatistics } from "./text-statistics";
import {
  type Book,
  type BookSummary,
  type GeneratedUnit,
  type CountInput,
  type Unit,
  type SourceSection,
  type PoolState,
  SessionPools,
  booksQuery,
  bookQuery,
  defaultBookId,
  orderBooks,
  sectionsQuery,
  escapeMarkdown,
  selectPreview,
  formatTextWithAttribution,
  pasteActionTitle,
  updateCountInput,
  parseCountInput,
  validateGenerationRequest,
  orderedActions,
} from "./generator";

const DATABASE_PATH = join(environment.assetsPath, "corpus.db");

async function getPasteTitle(): Promise<string> {
  try {
    return pasteActionTitle((await getFrontmostApplication()).name);
  } catch {
    return pasteActionTitle(undefined);
  }
}

type SelectionState = { bookId: string; revision: number; result?: PoolState };

export default function GenerateText({ unit }: { unit: Unit }) {
  const { data: pasteTitle } = usePromise(getPasteTitle);
  const preferences = getPreferenceValues<Preferences>();
  const defaultCount = validateGenerationRequest(
    unit,
    unit === "passages" ? preferences.defaultParagraphCount : preferences.defaultSentenceCount,
  ).count;
  const [count, setCount] = useState<CountInput>(() => ({
    input: "",
    request: parseCountInput(unit, "", defaultCount),
  }));
  const {
    data: books,
    isLoading: booksLoading,
    error: booksError,
    revalidate: reloadBooks,
  } = useSQL<BookSummary>(DATABASE_PATH, booksQuery, { onError: () => undefined });
  const [chosenBook, setChosenBook] = useState<string>();
  const bookId = chosenBook ?? defaultBookId(preferences.defaultBook, books ?? []);
  const listedBook = books?.find((book) => book.id === bookId);
  const {
    data: bookRows,
    isLoading: bookLoading,
    error: bookError,
    revalidate: reloadBook,
  } = useSQL<Book>(DATABASE_PATH, bookQuery(bookId), { execute: !!listedBook, onError: () => undefined });
  const book = bookRows?.find((book) => book.id === bookId);
  const [pools] = useState(() => new SessionPools(unit, (sql) => executeSQL<GeneratedUnit>(DATABASE_PATH, sql)));
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState<SelectionState>();
  useEffect(() => {
    if (!listedBook) return;
    let current = true;
    void pools.load(listedBook.id).then((result) => {
      if (current) setSelection({ bookId: listedBook.id, revision, result });
    });
    return () => {
      current = false;
    };
  }, [listedBook, pools, revision]);
  // Matching both identities prevents stale previews/actions before the effect runs, too.
  const result = selection?.bookId === bookId && selection.revision === revision ? selection.result : undefined;
  const isLoading = booksLoading || (!!listedBook && (bookLoading || !result));
  const message = booksError
    ? "The bundled books could not be loaded. Try again."
    : bookError
      ? "The selected book information could not be loaded. Try again."
      : !booksLoading && !listedBook
        ? "The selected book is unavailable. Choose another book."
        : result?.status === "error"
          ? result.message
          : undefined;
  const preview =
    book && !bookError && result?.status === "ready" ? selectPreview(count.request, result.rows) : undefined;
  const statistics = preview && book ? textStatistics(preview.text, book.locale) : undefined;
  const markdown = [
    ...(count.error ? [`**Invalid count:** ${count.error}`] : []),
    isLoading
      ? "Selecting source text…"
      : preview
        ? escapeMarkdown(preview.text)
        : `# Could not generate text\n\n${message ?? "Choose a book."}`,
    ...(statistics ? ["---", statisticsSummary(statistics)] : []),
  ].join("\n\n");
  const regenerate = () => {
    if (!listedBook) {
      void reloadBooks();
      return;
    }
    if (bookError || !book) void reloadBook();
    void pools.load(listedBook.id, true);
    setRevision((value) => value + 1);
  };
  const actions = (
    <ActionPanel>
      {preview && !count.error
        ? orderedActions(preferences.primaryAction).map((action) =>
            action === "copy" ? (
              <Action.CopyToClipboard
                key="copy"
                title="Copy to Clipboard"
                content={preview.text}
                onCopy={() => {
                  void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                }}
              />
            ) : (
              <Action.Paste
                key="paste"
                title={pasteTitle ?? "Paste to Active App"}
                content={preview.text}
                onPaste={() => {
                  void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                }}
              />
            ),
          )
        : null}
      {preview && book && !count.error ? (
        <Action.CopyToClipboard
          title="Copy with Attribution"
          content={formatTextWithAttribution(book, preview)}
          onCopy={() => {
            void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
          }}
        />
      ) : null}
      {!isLoading && !count.error ? (
        <Action
          title={message ? "Try Again" : "Regenerate"}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={regenerate}
        />
      ) : null}
      {book ? (
        <Action.Push
          title="Information"
          icon={Icon.Info}
          target={<Information book={book} selected={preview?.selected ?? []} />}
        />
      ) : null}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
  return (
    <List
      navigationTitle={`Generate ${unit === "passages" ? "Passages" : "Sentences"}`}
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      searchText={count.input}
      onSearchTextChange={(input) => setCount((previous) => updateCountInput(previous, input, defaultCount))}
      searchBarPlaceholder={`Number of ${unit} (default ${defaultCount})`}
      selectedItemId={bookId}
      onSelectionChange={(id) => {
        if (id) setChosenBook(id);
      }}
    >
      {orderBooks(books ?? [], defaultBookId(preferences.defaultBook, books ?? [])).map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          title={item.title}
          subtitle={item.language}
          detail={item.id === bookId ? <List.Item.Detail markdown={markdown} /> : undefined}
          actions={item.id === bookId ? actions : undefined}
        />
      ))}
      {!books?.length ? (
        <List.EmptyView
          title={booksLoading ? "Loading books…" : "Books unavailable"}
          description={message}
          actions={actions}
        />
      ) : null}
    </List>
  );
}

function statisticsSummary(statistics: TextStatistics): string {
  const characters = statistics.characters.toLocaleString();
  const words = statistics.words.toLocaleString();
  const fontSize = environment.textSize === "large" ? 28 : 24;
  // Raycast scales the wide image to the detail pane; Markdown has no font-size control.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="96" viewBox="0 0 1000 96">
    <g font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}">
      <g fill="${Color.SecondaryText}">
        <text x="0" y="28">Total characters</text>
        <text x="0" y="76">Total words</text>
      </g>
      <g fill="${Color.PrimaryText}" text-anchor="end">
        <text x="1000" y="28">${characters}</text>
        <text x="1000" y="76">${words}</text>
      </g>
    </g>
  </svg>`;
  const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return `![Total characters: ${characters}; total words: ${words}](${image}?raycast-width=1000&raycast-height=96)`;
}

function sectionLinks(section: SourceSection): string {
  return `- **${escapeMarkdown(section.title)}** (${escapeMarkdown(section.edition)}) — [Source](${section.source_url}) · [Revision / snapshot source](${section.revision_url})`;
}

function Information({ book, selected }: { book: Book; selected: SourceSection[] }) {
  const { data, isLoading, error, revalidate } = useSQL<SourceSection>(DATABASE_PATH, sectionsQuery(book.id), {
    onError: () => undefined,
  });
  const selectedSections = [...new Map(selected.map((section) => [section.section_id, section])).values()];
  const markdown = [
    `# ${escapeMarkdown(book.title)}`,
    `By **${escapeMarkdown(book.author)}**. ${escapeMarkdown(book.language)}.`,
    `**Edition:** ${escapeMarkdown(book.edition)}`,
    `**Scope:** ${escapeMarkdown(book.scope)}`,
    escapeMarkdown(book.editorial_note),
    `**License:** ${escapeMarkdown(book.license)}`,
    escapeMarkdown(book.attribution),
    `[Read the source](${book.source_url})`,
    ...(selectedSections.length ? ["## Selected sections", selectedSections.map(sectionLinks).join("\n")] : []),
    "## All bundled sections",
    isLoading
      ? "Loading sources…"
      : error || !data?.length
        ? "Sources could not be loaded. Try again."
        : data.map(sectionLinks).join("\n"),
  ].join("\n\n");
  return (
    <Detail
      navigationTitle="Information"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Source" url={book.source_url} />
          {!isLoading && (error || !data?.length) ? <Action title="Try Again" onAction={revalidate} /> : null}
        </ActionPanel>
      }
    />
  );
}
