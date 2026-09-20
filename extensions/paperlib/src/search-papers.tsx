import { existsSync, promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { resolveAbstract } from "./lib/abstracts";
import { citationKey, toBibTeX, toCitation } from "./lib/format";
import { searchLibrary } from "./lib/library";
import { missingWebLinkMessage, paperWebUrl, resolveLocalPdf } from "./lib/links";
import { paperMarkdown } from "./lib/markdown";
import { mapPreferences } from "./lib/preferences";
import type { LibraryUnavailableError } from "./lib/types";
import type { PaperEntity, SearchResult } from "./lib/types";

const nodeFs = {
  readFile: (path: string, encoding: "utf8") => fs.readFile(path, encoding),
  readdir: (path: string) => fs.readdir(path),
  stat: (path: string) => fs.stat(path),
};

export default function Command() {
  const preferences = mapPreferences(getPreferenceValues<Preferences.SearchPapers>());
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (query: string) =>
      searchLibrary(query, withDefaultLibraryFolder(preferences), {
        fs: nodeFs,
        env: process.env,
      }),
    [searchText],
    { keepPreviousData: true },
  );

  const result: SearchResult | undefined = data;
  const papers = result?.papers ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && papers.length > 0}
      searchBarPlaceholder="Search title, authors, venue, DOI, or notes"
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      throttle
      filtering={false}
      navigationTitle={result ? `Paperlib · ${sourceBadge(result)}` : "Paperlib"}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Can't reach Paperlib"
          description={formatError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              <Action.OpenInBrowser title="Open Paperlib Docs" url="https://paperlib.app/en/extension-doc/" />
              <Action.OpenInBrowser
                title="API Host Extension"
                url="https://github.com/Future-Scholars/paperlib-apihost-extension"
              />
            </ActionPanel>
          }
        />
      ) : papers.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No matching papers" : "Library is empty"}
          description={
            result?.source === "demo"
              ? "Demo papers are loaded because Paperlib is not connected. Install the API Host extension and keep Paperlib running."
              : "Try a broader query, or check that Paperlib's API Host extension is running."
          }
        />
      ) : (
        papers.map((paper) => (
          <PaperItem
            key={paper.id}
            paper={paper}
            result={result}
            citationStyle={preferences.citationStyle}
            fetchRemoteAbstracts={preferences.fetchRemoteAbstracts}
            selected={selectedId === paper.id}
            showingDetail={showingDetail}
            libraryFolder={result?.libraryFolder ?? preferences.libraryFolder}
            onToggleDetail={() => setShowingDetail((value) => !value)}
          />
        ))
      )}
    </List>
  );
}

function PaperItem(props: {
  paper: PaperEntity;
  result?: SearchResult;
  citationStyle: "apa" | "harvard";
  fetchRemoteAbstracts: boolean;
  selected: boolean;
  showingDetail: boolean;
  libraryFolder?: string;
  onToggleDetail: () => void;
}) {
  const { paper, citationStyle, fetchRemoteAbstracts, selected, showingDetail, libraryFolder, onToggleDetail, result } =
    props;
  const citation = toCitation(paper, citationStyle);
  const bibtex = toBibTeX(paper);
  const key = citationKey(paper);
  const webUrl = paperWebUrl(paper);
  const pdf = resolveLocalPdf(paper, libraryFolder);

  const { data: abstract } = useCachedPromise(
    async (current: PaperEntity, enabled: boolean) => resolveAbstract(current, { enabled }),
    [paper, fetchRemoteAbstracts],
    { execute: selected },
  );

  const detailed = useMemo(() => ({ ...paper, abstract: abstract || paper.abstract }), [paper, abstract]);

  const accessories: List.Item.Accessory[] = [];
  if (paper.pubTime) {
    accessories.push({ text: paper.pubTime });
  }
  if (paper.flag) {
    accessories.push({ tag: { value: "Flagged", color: Color.Orange } });
  }

  return (
    <List.Item
      icon={paper.flag ? Icon.Star : Icon.Document}
      title={paper.title || "Untitled paper"}
      subtitle={showingDetail ? undefined : paper.authors}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={paperMarkdown(detailed, citation)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Authors" text={paper.authors || "—"} />
              <List.Item.Detail.Metadata.Label title="Venue" text={paper.publication || "—"} />
              <List.Item.Detail.Metadata.Label title="Year" text={paper.pubTime || "—"} />
              {paper.doi ? (
                <List.Item.Detail.Metadata.Link title="DOI" text={paper.doi} target={`https://doi.org/${paper.doi}`} />
              ) : null}
              {paper.arxiv ? (
                <List.Item.Detail.Metadata.Link
                  title="arXiv"
                  text={paper.arxiv}
                  target={`https://arxiv.org/abs/${paper.arxiv}`}
                />
              ) : null}
              {webUrl ? <List.Item.Detail.Metadata.Link title="Web" text={webUrl} target={webUrl} /> : null}
              <List.Item.Detail.Metadata.Label title="PDF" text={pdf.ok ? pdf.path : "Not in library record"} />
              <List.Item.Detail.Metadata.Label title="Citation key" text={key} />
              {result ? <List.Item.Detail.Metadata.Label title="Source" text={result.sourceLabel} /> : null}
              {paper.tags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {paper.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action
              title="Open PDF"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => openLocalPdf(paper, libraryFolder)}
            />
            <Action
              title="Open Web Link"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={() => openPaperWebLink(paper)}
            />
            <Action
              title="Copy Web Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() => copyPaperWebLink(paper)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy DOI"
              icon={Icon.Hashtag}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                if (!paper.doi) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No DOI",
                    message: "This Paperlib record does not include a DOI.",
                  });
                  return;
                }
                await Clipboard.copy(paper.doi);
                await copied(`DOI ${paper.doi}`);
              }}
            />
            <Action.CopyToClipboard
              title="Copy Citation"
              content={citation}
              icon={Icon.QuoteBlock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy BibTeX"
              content={bibtex}
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
            <Action.CopyToClipboard
              title="Copy Citation Key"
              content={key}
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={showingDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={onToggleDetail}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function sourceBadge(result: SearchResult): string {
  if (result.source === "api") {
    return "Live";
  }
  if (result.source === "local") {
    return "Local export";
  }
  return "Demo";
}

function formatError(error: Error): string {
  const unavailable = error as LibraryUnavailableError;
  const hints = unavailable.hints?.length ? `\n\n${unavailable.hints.map((hint) => `• ${hint}`).join("\n")}` : "";
  return `${error.message}${hints}`;
}

async function copied(message: string) {
  await showToast({ style: Toast.Style.Success, title: "Copied", message });
}

async function openLocalPdf(paper: PaperEntity, libraryFolder?: string) {
  const resolved = resolveLocalPdf(paper, libraryFolder);
  if (!resolved.ok) {
    await showToast({ style: Toast.Style.Failure, title: "No local PDF", message: resolved.error });
    return;
  }

  if (!existsSync(resolved.path)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "PDF not found",
      message: `The library record points at ${resolved.path}, but that file is not on disk.`,
    });
    return;
  }

  await open(resolved.path);
}

async function openPaperWebLink(paper: PaperEntity) {
  const url = paperWebUrl(paper);
  if (!url) {
    await showToast({ style: Toast.Style.Failure, title: "No web link", message: missingWebLinkMessage(paper) });
    return;
  }
  await open(url);
}

async function copyPaperWebLink(paper: PaperEntity) {
  const url = paperWebUrl(paper);
  if (!url) {
    await showToast({ style: Toast.Style.Failure, title: "No web link", message: missingWebLinkMessage(paper) });
    return;
  }
  await Clipboard.copy(url);
  await copied(url);
}

function withDefaultLibraryFolder(preferences: ReturnType<typeof mapPreferences>) {
  if (preferences.libraryFolder || preferences.localLibraryFile) {
    return preferences;
  }

  return {
    ...preferences,
    libraryFolder: join(homedir(), "Documents", "paperlib"),
  };
}
