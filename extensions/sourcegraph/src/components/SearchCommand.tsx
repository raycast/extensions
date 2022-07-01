import { ActionPanel, List, Action, Detail, Icon, Image } from "@raycast/api";
import React, { useState, Fragment, useMemo } from "react";
import { nanoid } from "nanoid";
import { DateTime } from "luxon";

import { Sourcegraph, instanceName, LinkBuilder } from "../sourcegraph";
import { PatternType, SearchResult, Suggestion } from "../sourcegraph/stream-search";
import { ContentMatch, SymbolMatch } from "../sourcegraph/stream-search/stream";
import { BlobContentsFragment as BlobContents, useGetFileContentsLazyQuery } from "../sourcegraph/gql/operations";
import { bold, codeBlock, quoteBlock } from "../markdown";
import { count, sentenceCase } from "../text";
import { useSearch } from "../hooks/search";

import { ColorDefault, ColorEmphasis, ColorPrivate } from "./colors";
import { copyShortcut, drilldownShortcut, tertiaryActionShortcut } from "./shortcuts";

const link = new LinkBuilder("search");

const MAX_RENDERED_RESULTS = 100;

/**
 * SearchCommand is the shared search command implementation.
 */
export default function SearchCommand({ src }: { src: Sourcegraph }) {
  const [searchText, setSearchText] = useState(src.defaultContext ? `context:${src.defaultContext} ` : "");
  const [patternType, setPatternType] = useState<PatternType | undefined>(
    src.featureFlags.searchPatternDropdown ? undefined : "literal"
  );

  const { state, search } = useSearch(src, MAX_RENDERED_RESULTS);
  useMemo(() => {
    if (patternType) {
      search(searchText, patternType);
    }
  }, [searchText, patternType]);

  const srcName = instanceName(src);
  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={`Search ${srcName} (e.g. 'fmt.Sprintf lang:go')`}
      throttle
      searchBarAccessory={
        src.featureFlags.searchPatternDropdown ? <SearchDropdown setPatternType={setPatternType} /> : undefined
      }
    >
      {/* show suggestions IFF no results */}
      {!state.isLoading && state.results.length === 0 ? (
        <List.Section title="Suggestions" subtitle={state.summary || ""}>
          {state.suggestions.slice(0, 3).map((suggestion, i) => (
            <SuggestionItem
              key={`suggestion-item-${i}`}
              suggestion={suggestion}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          ))}

          <Fragment>
            <List.Item
              title={`${searchText.length > 0 ? "Continue" : "Compose"} query in browser`}
              icon={{ source: Icon.MagnifyingGlass }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={getQueryURL(src, searchText)} />
                </ActionPanel>
              }
            />
            <List.Item
              title="View search query syntax reference"
              icon={{ source: Icon.QuestionMark }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={link.new(src, "/help/code_search/reference/queries")} />
                </ActionPanel>
              }
            />
          </Fragment>
        </List.Section>
      ) : (
        <Fragment />
      )}

      {/* results */}
      <List.Section
        title="Results"
        subtitle={state.summaryDetail ? `${state.summary} (${state.summaryDetail})` : state.summary}
      >
        {state.results.map((searchResult, i) => (
          <SearchResultItem
            key={`result-item-${i}`}
            searchResult={searchResult}
            searchText={searchText}
            src={src}
            setSearchText={setSearchText}
          />
        ))}
      </List.Section>
    </List>
  );
}

/**
 * Dropdown, currently for pattern type. I'm a bit torn on whether to place contexts or
 * pattern type here, and the dropdown element itself is quite wide, so this is behind
 * a feature flag for now.
 */
function SearchDropdown({ setPatternType }: { setPatternType: (pt: PatternType) => void }) {
  const patternTypes: { type: PatternType; name: string; icon: Image.ImageLike }[] = [
    {
      type: "literal",
      name: "Literal search",
      icon: Icon.Bubble,
    },
    {
      type: "regexp",
      name: "Regular expression search",
      icon: Icon.Dot,
    },
    {
      type: "structural",
      name: "Structural search",
      icon: Icon.Terminal,
    },
  ];
  return (
    <List.Dropdown tooltip="Search pattern syntax" onChange={(v) => setPatternType(v as PatternType)} storeValue>
      {patternTypes.map((pt) => (
        <List.Dropdown.Item key={pt.type} title={pt.name} value={pt.type} icon={pt.icon} />
      ))}
    </List.Dropdown>
  );
}

interface CustomResultActions {
  openAction?: JSX.Element;
  extraActions?: JSX.Element[];
}

function resultActions(url: string, customActions?: CustomResultActions) {
  const actions: JSX.Element[] = [];
  if (customActions?.openAction) {
    actions.push(customActions.openAction);
  }
  actions.push(<Action.OpenInBrowser key={nanoid()} title="Open Result in Browser" url={url} />);
  if (customActions?.extraActions) {
    actions.push(...customActions.extraActions);
  }
  actions.push(
    // Can't seem to override the shortcut on this thing if it's the second action, so
    // add it as the third action instead.
    <Action.CopyToClipboard key={nanoid()} title="Copy Link to Result" content={url} shortcut={copyShortcut} />
  );
  return (
    <ActionPanel.Section key={nanoid()} title="Result Actions">
      {...actions}
    </ActionPanel.Section>
  );
}

function getQueryURL(src: Sourcegraph, query: string) {
  return link.new(src, "/search", new URLSearchParams({ q: query }));
}

// https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
// adjusted to remove the forward slash ('/') escape, because it seems we don't need it
const regexpRe = /[-\\^$*+?.()|[\]{}]/g;

function escapeRegexp(text: string) {
  return text.replace(regexpRe, "\\$&");
}

function makeDrilldownAction(
  name: string,
  setSearchText: (text: string) => void,
  opts: { repo?: string; revision?: string; file?: string }
) {
  const clauses: string[] = [];
  if (opts.repo) {
    let repoQuery = `r:^${escapeRegexp(opts.repo)}$`;
    if (opts.revision) {
      repoQuery += `@${opts.revision}`;
    }
    clauses.push(repoQuery);
  }
  if (opts.file) {
    clauses.push(`f:${escapeRegexp(opts.file)}`);
  }

  return (
    <Action
      title={name}
      icon={Icon.Binoculars}
      key={nanoid()}
      shortcut={drilldownShortcut}
      onAction={() => {
        setSearchText(`${clauses.join(" ")} `);
      }}
    />
  );
}

function SearchResultItem({
  searchResult,
  searchText,
  src,
  setSearchText,
}: {
  searchResult: SearchResult;
  searchText: string;
  src: Sourcegraph;
  setSearchText: (text: string) => void;
}) {
  const queryURL = getQueryURL(src, searchText);
  const { match } = searchResult;

  // Branches is a common property for setting a revision
  let revisions: string[] | undefined;
  let firstRevision: string | undefined;
  if ("branches" in match && match.branches) {
    revisions = match.branches;
    firstRevision = match.branches[0];
  }

  // Title to denote the result
  let title = "";
  // Subtitle to show context about the result
  let subtitle = "";
  // Icon to denote the type of the result
  const icon: Image.ImageLike = { source: Icon.Dot, tintColor: ColorDefault };
  // Broader context about the result, usually just the repository.
  const accessory: List.Item.Accessory = firstRevision
    ? {
        text: `${match.repository}@${firstRevision}`,
        tooltip: `${match.repository}@${firstRevision}`,
      }
    : { text: match.repository, tooltip: match.repository };

  // Action to drill down on the search result.
  let drilldownAction: React.ReactElement | undefined;
  // Details about the match type, to present on icon hover
  const matchTypeDetails: string[] = [];
  // Details about the match, to present on title hover
  const matchDetails: string[] = [];
  // Details about the subtitle, to present on subtitle hover. Defaults to just the
  // subtitle, which can be long and helpful to present in the results list.
  let subtitleTooltip: string | undefined;

  // A guesstimated threshold at which title + subtitle is long and likely to cause
  // cutting-off of text
  const combinedThreshold = 90;

  switch (match.type) {
    case "repo":
      if (match.fork) {
        icon.source = Icon.Circle;
        matchTypeDetails.push("forked");
      }
      if (match.archived) {
        icon.source = Icon.XmarkCircle;
        matchTypeDetails.push("archived");
      }
      // TODO color results of all matches based on repo privacy
      if (match.private) {
        icon.tintColor = ColorPrivate;
        matchTypeDetails.push("private");
      }
      title = match.repository;
      subtitle = match.description || "";
      if (revisions) {
        // On revision matches, render the branch match first and move the default
        // subtitle to a hover item.
        subtitleTooltip = subtitle;
        subtitle = revisions.map((r) => `@${r}`).join(", ");
      }
      // Add repo name to popover if we are at risk of cutting it off
      if (title.length > 30 && title.length + subtitle.length > combinedThreshold) {
        matchDetails.push(match.repository);
      }
      if (match.repoStars) {
        accessory.text = `${match.repoStars}`;
        accessory.icon = Icon.Star;
        accessory.tooltip = "";
      } else {
        accessory.text = "";
      }
      drilldownAction = makeDrilldownAction("Search Repository", setSearchText, {
        repo: match.repository,
        revision: firstRevision,
      });
      break;

    case "commit":
      icon.source = Icon.MemoryChip;
      title = match.message;
      subtitle = DateTime.fromISO(match.authorDate).toRelative() || match.authorDate;
      subtitleTooltip = match.authorDate;
      matchDetails.push(`by ${match.authorName}`);
      drilldownAction = makeDrilldownAction("Search Revision of Repository", setSearchText, {
        repo: match.repository,
        revision: match.oid, // a commit is always a revision
      });
      break;

    case "path":
      icon.source = Icon.TextDocument;
      title = match.path;
      drilldownAction = makeDrilldownAction("Search File", setSearchText, {
        repo: match.repository,
        file: match.path,
        revision: firstRevision,
      });
      break;

    case "content":
      icon.source = Icon.Text;
      title = match.lineMatches.map((l) => l.line.trim()).join(" ... ");
      subtitle = match.path;
      matchDetails.push(count(match.lineMatches.length, "line match", "line matches"));
      drilldownAction = makeDrilldownAction("Search File", setSearchText, {
        repo: match.repository,
        file: match.path,
        revision: firstRevision,
      });
      break;

    case "symbol":
      icon.source = Icon.Link;
      title = match.symbols.map((s) => s.name).join(", ");
      subtitle = match.path;
      matchDetails.push(count(match.symbols.length, "symbol match", "symbols matches"));
      drilldownAction = makeDrilldownAction("Search File", setSearchText, {
        repo: match.repository,
        file: match.path,
        revision: firstRevision,
      });
      break;
  }

  const accessories: List.Item.Accessory[] = [];
  if (accessory.text || accessory.icon) {
    accessories.push(accessory);
  }

  return (
    <List.Item
      title={{ value: title, tooltip: matchDetails.join(", ") }}
      subtitle={{
        value: subtitle,
        // If no subtitle is present, let subtitle itself be hoverable if it is long
        // using a guesstimated threshold
        tooltip:
          subtitleTooltip ||
          (subtitle.length > 60 && title.length + subtitle.length > combinedThreshold ? subtitle : ""),
      }}
      accessories={accessories}
      icon={{ value: icon, tooltip: sentenceCase(`${matchTypeDetails.join(", ")} ${match.type} match`) }}
      actions={
        <ActionPanel>
          {resultActions(searchResult.url, {
            openAction: (
              <Action.Push
                key={nanoid()}
                title="View Result"
                target={<ResultView src={src} searchResult={searchResult} icon={icon} />}
                icon={{ source: Icon.MagnifyingGlass }}
              />
            ),
            extraActions: drilldownAction && [drilldownAction],
          })}
          <ActionPanel.Section key={nanoid()} title="Query Actions">
            <Action.OpenInBrowser title="Open Query" url={queryURL} shortcut={tertiaryActionShortcut} />
            <Action.CopyToClipboard title="Copy Link to Query" content={queryURL} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function MultiResultView({ searchResult }: { searchResult: { url: string; match: ContentMatch | SymbolMatch } }) {
  const { match } = searchResult;
  const navigationTitle = `View ${match.type} results`;
  const matchTitle = `${match.repository} ${match.repoStars ? `- ${match.repoStars} ★` : ""}`;

  const urlWithLineNumber = (url: string, line: number) => {
    const parsed = new URL(url);
    parsed.searchParams.set(`L${line}`, "");
    // L needs to be the first param. Kind of mysterious. Sort works by luck because L
    // comes before U in the UTM params, but might need to be more careful
    parsed.searchParams.sort();
    return parsed.toString();
  };

  // Match types with expanded view support
  switch (match.type) {
    case "content":
      return (
        <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter matches">
          <List.Section title={match.path} subtitle={matchTitle}>
            {match.lineMatches.map((l) => (
              <List.Item
                key={nanoid()}
                title={l.line}
                accessories={[{ text: `L${l.lineNumber}` }]}
                actions={<ActionPanel>{resultActions(urlWithLineNumber(searchResult.url, l.lineNumber))}</ActionPanel>}
              />
            ))}
          </List.Section>
        </List>
      );

    case "symbol":
      return (
        <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter symbols">
          <List.Section title={match.path} subtitle={matchTitle}>
            {match.symbols.map((s) => (
              <List.Item
                key={nanoid()}
                title={s.name}
                subtitle={s.containerName}
                accessories={[{ text: s.kind.toLowerCase() }]}
                actions={<ActionPanel>{resultActions(s.url)}</ActionPanel>}
              />
            ))}
          </List.Section>
        </List>
      );
  }
}

/**
 * Safely render the given blob as Markdown content.
 */
function renderBlob(blob: BlobContents | null | undefined): string {
  if (!blob) {
    return quoteBlock("File not found");
  }
  if (blob.binary) {
    return quoteBlock("File preview is not yet supported for binary files.");
  }

  if (blob.content) {
    const blobSizeKB = blob.byteSize / 1024;
    if (blobSizeKB > 50) {
      return quoteBlock(`File too large to render (${blobSizeKB}KB)`);
    } else {
      return blob.path.endsWith(".md") ? blob.content : codeBlock(blob.content);
    }
  }

  return quoteBlock("No content found");
}

function ResultView({
  src,
  searchResult,
  icon,
}: {
  src: Sourcegraph;
  searchResult: SearchResult;
  icon: Image.ImageLike;
}) {
  const [getFileContents, fileContents] = useGetFileContentsLazyQuery(src);

  const { match } = searchResult;
  const navigationTitle = `View ${match.type} result`;
  const markdownTitle = bold(match.repository);
  let markdownContent = "";
  const metadata: React.ReactNode[] = [
    <Detail.Metadata.TagList title="Match type" key={nanoid()}>
      <Detail.Metadata.TagList.Item text={match.type} icon={icon} />
    </Detail.Metadata.TagList>,
    <Detail.Metadata.Link
      title="Repository"
      text={match.repository}
      target={`https://${match.repository}`}
      key={nanoid()}
    />,
  ];

  switch (match.type) {
    // Match types that have multi result view

    case "content":
    case "symbol":
      return <MultiResultView searchResult={{ url: searchResult.url, match }} key={nanoid()} />;

    // Match types that use markdown view

    case "repo":
      markdownContent = match.description || "";
      metadata.push(
        <Detail.Metadata.Label title="Visibility" text={match.private ? "Private" : "Public"} key={nanoid()} />
      );
      if (!fileContents.called) {
        getFileContents({
          variables: {
            repo: match.repository,
            rev: match.branches?.[0] || "",
            path: "README.md",
          },
        });
      } else if (fileContents.data) {
        const blob = fileContents.data.repository?.commit?.blob;
        markdownContent += `\n\n---\n\n${renderBlob(blob)}`;
      }
      break;

    case "path":
      markdownContent = `${codeBlock(match.path)}\n\n---\n\n`;
      if (!fileContents.called) {
        getFileContents({
          variables: {
            repo: match.repository,
            rev: match.commit || "",
            path: match.path,
          },
        });
      } else if (fileContents.data) {
        const blob = fileContents.data.repository?.commit?.blob;
        markdownContent += renderBlob(blob);
      } else if (fileContents.error) {
        markdownContent += quoteBlock(`Failed to fetch file: ${fileContents.error}`);
      }
      break;

    case "commit": {
      markdownContent = match.message;
      metadata.push(
        <Detail.Metadata.Label title="Author" text={match.authorName} key={nanoid()} />,
        <Detail.Metadata.Label title="Commit" text={match.oid} key={nanoid()} />,
        <Detail.Metadata.Label
          title="Committed"
          text={DateTime.fromISO(match.authorDate).toRelative() || "Unknown"}
          key={nanoid()}
        />
      );
      break;
    }

    default:
      markdownContent = `Unsupported result type - full data:\n\n${codeBlock(JSON.stringify(match, null, "  "))}`;
  }

  if (match.repoStars) {
    metadata.push(<Detail.Metadata.Label title="Stars" text={`${match.repoStars}`} key={nanoid()} />);
  }

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={`${markdownTitle}\n\n${markdownContent}`}
      actions={<ActionPanel>{resultActions(searchResult.url)}</ActionPanel>}
      metadata={
        <Detail.Metadata>
          <>{metadata}</>
        </Detail.Metadata>
      }
    ></Detail>
  );
}

function SuggestionItem({
  suggestion,
  searchText,
  setSearchText,
}: {
  suggestion: Suggestion;
  searchText: string;
  setSearchText: (text: string) => void;
}) {
  return (
    <List.Item
      title={suggestion.title}
      subtitle={suggestion.description || "Press 'Enter' to apply suggestion"}
      icon={{
        source: suggestion.query ? Icon.Binoculars : Icon.ExclamationMark,
        tintColor: suggestion.query ? ColorDefault : ColorEmphasis,
      }}
      actions={
        suggestion.query ? (
          <ActionPanel>
            <Action
              title="Apply Suggestion"
              icon={Icon.Clipboard}
              onAction={async () => {
                const { query } = suggestion;
                if (typeof query === "object") {
                  setSearchText(`${searchText} ${query.addition}`);
                } else {
                  setSearchText(query || "");
                }
              }}
            />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <Action.Push
              title="View Suggestion"
              icon={{ source: Icon.Document }}
              target={
                <Detail
                  markdown={`${suggestion.title}${suggestion.description ? `\n\n${suggestion.description}` : ""}`}
                  navigationTitle="Suggestion"
                />
              }
            />
          </ActionPanel>
        )
      }
    />
  );
}
