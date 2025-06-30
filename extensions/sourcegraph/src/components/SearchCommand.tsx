import {
  ActionPanel,
  List,
  Action,
  Detail,
  Icon,
  Image,
  Color,
  LaunchProps,
  launchCommand,
  LaunchType,
  Keyboard,
} from "@raycast/api";
import { ReactElement, ReactNode, useState, Fragment, useEffect } from "react";
import { nanoid } from "nanoid";
import { DateTime } from "luxon";

import { Sourcegraph, instanceName, LinkBuilder, isSourcegraphDotCom } from "../sourcegraph";
import { PatternType, SearchResult, Suggestion } from "../sourcegraph/stream-search";
import { ContentMatch, SymbolMatch } from "../sourcegraph/stream-search/stream";
import {
  BlobContentsFragment as BlobContents,
  useGetFileContentsLazyQuery,
  SymbolKind,
} from "../sourcegraph/gql/operations";
import { bold, codeBlock, quoteBlock } from "../markdown";
import { count, sentenceCase } from "../text";
import { useSearch } from "../hooks/search";

import { ColorDefault, ColorEmphasis, ColorError, ColorPrivate, ColorSubdued } from "./colors";
import { copyShortcut, drilldownShortcut, tertiaryActionShortcut, deleteShortcut } from "./shortcuts";
import { SearchHistory } from "../searchHistory";
import { useTelemetry } from "../hooks/telemetry";
import path from "path";

const link = new LinkBuilder("search");

const MAX_RENDERED_RESULTS = 100;

function initialSearchText(src: Sourcegraph, props?: LaunchProps): string {
  if (props) {
    const historyItem = SearchHistory.fromLaunchProps(props);
    if (historyItem) {
      return historyItem.query;
    }
  }
  return src.defaultContext ? `context:${src.defaultContext} ` : "";
}

/**
 * SearchCommand is the shared search command implementation.
 */
export default function SearchCommand({ src, props }: { src: Sourcegraph; props?: LaunchProps }) {
  const { recorder } = useTelemetry(src);
  useEffect(() => recorder.recordEvent("search", "start"), []);

  const [searchText, setSearchText] = useState(initialSearchText(src, props));
  const [patternType, setPatternType] = useState<PatternType | undefined>(
    src.featureFlags.searchPatternDropdown ? undefined : "standard",
  );

  const { state, search } = useSearch(src, MAX_RENDERED_RESULTS);

  // Search whenever the search text or patttern type changes.
  useEffect(() => {
    if (patternType) {
      search(searchText, patternType);
    }
  }, [searchText, patternType]);

  const srcName = instanceName(src);
  const searchSummary = state.summaryDetail ? `${state.summary} (${state.summaryDetail})` : state.summary;

  const openQueryInBrowserAction = (
    <Action.OpenInBrowser
      icon={Icon.Window}
      title="Continue query in browser"
      url={getQueryURL(src, searchText, patternType)}
    />
  );
  const openSearchSyntaxAction = (
    <Action.OpenInBrowser
      icon={Icon.Book}
      title="View search reference"
      url={link.new(src, "/help/code_search/reference/queries")}
    />
  );

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
      // actions are only shown when there aren't any children.
      actions={
        <ActionPanel>
          {openQueryInBrowserAction}
          {openSearchSyntaxAction}
          {state.isLoading && (
            <Action
              icon={Icon.Xmark}
              title="Cancel search"
              onAction={() => setSearchText("")}
              shortcut={deleteShortcut}
            />
          )}
        </ActionPanel>
      }
    >
      {/* show suggestions IFF no results */}
      {!state.isLoading && state.results.length === 0 && (
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
              title="View recent searches"
              icon={{ source: Icon.List }}
              actions={
                <ActionPanel>
                  <Action
                    title="Launch Code Search History"
                    onAction={async () =>
                      launchCommand({
                        name: isSourcegraphDotCom(src.instance) ? "searchHistoryDotCom" : "searchHistoryInstance",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={`${searchText.length > 0 ? "Continue" : "Compose"} query in browser`}
              icon={{ source: Icon.Window }}
              actions={<ActionPanel>{openQueryInBrowserAction}</ActionPanel>}
            />
            <List.Item
              title="View search query syntax reference"
              icon={{ source: Icon.Book }}
              actions={<ActionPanel>{openSearchSyntaxAction}</ActionPanel>}
            />
            {isSourcegraphDotCom(src.instance) && !src.hasCustomSourcegraphConnection && (
              <List.Item
                title="Create a Sourcegraph workspace"
                subtitle="Get an AI & search experience for your private code"
                icon={{ source: Icon.Stars, tintColor: ColorEmphasis }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      icon={Icon.Window}
                      title="Learn more"
                      url="https://workspaces.sourcegraph.com"
                    />
                  </ActionPanel>
                }
              />
            )}
          </Fragment>
        </List.Section>
      )}

      {state.isLoading && state.results.length === 0 && (
        <List.EmptyView title={"Searching..."} description={searchSummary || "No results yet"} />
      )}

      {/* results */}
      <List.Section title="Results" subtitle={searchSummary || (state.isLoading ? "Searching..." : undefined)}>
        {state.results.map((searchResult, i) => (
          <SearchResultItem
            key={`result-item-${i}`}
            searchResult={searchResult}
            searchText={searchText}
            patternType={patternType}
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
      type: "standard",
      name: "Standard",
      icon: Icon.MagnifyingGlass,
    },
    {
      type: "literal",
      name: "Literal",
      icon: Icon.QuotationMarks,
    },
    {
      type: "regexp",
      name: "RegExp",
      icon: Icon.Code,
    },
    {
      type: "keyword",
      name: "Keyword",
      icon: Icon.Text,
    },
    {
      type: "structural",
      name: "Structural",
      icon: Icon.Terminal,
    },
  ];
  return (
    <List.Dropdown
      tooltip="Search pattern"
      onChange={(v) => setPatternType(v as PatternType)}
      storeValue
      placeholder="Choose a pattern type..."
    >
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
    <Action.CopyToClipboard key={nanoid()} title="Copy Link to Result" content={url} shortcut={copyShortcut} />,
  );
  return (
    <ActionPanel.Section key={nanoid()} title="Result Actions">
      {...actions}
    </ActionPanel.Section>
  );
}

function getQueryURL(src: Sourcegraph, query: string, pattern: PatternType | undefined) {
  const params: Record<string, string> = { q: query };
  if (pattern) {
    params.patternType = pattern;
  }
  return link.new(src, "/search", new URLSearchParams(params));
}

// https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
// adjusted to remove the forward slash ('/') escape, because it seems we don't need it
const regexpRe = /[-\\^$*+?.()|[\]{}]/g;

function escapeRegexp(text: string) {
  return text.replace(regexpRe, "\\$&");
}

/**
 * makeDrilldownAction creates an Action for replacing the current search with
 * a relevant fully qualified search clause.
 */
function makeDrilldownAction(
  name: string,
  setSearchText: (text: string) => void,
  opts: { repository: string; revision?: string; path?: string },
) {
  const clauses: string[] = [];
  if (opts.repository) {
    let repoQuery = `r:^${escapeRegexp(opts.repository)}$`;
    if (opts.revision) {
      repoQuery += `@${opts.revision}`;
    }
    clauses.push(repoQuery);
  }
  if (opts.path) {
    clauses.push(`f:${escapeRegexp(opts.path)}`);
  }

  return (
    <Action
      title={name}
      icon={Icon.MagnifyingGlass}
      key={nanoid()}
      shortcut={drilldownShortcut}
      onAction={() => {
        setSearchText(`${clauses.join(" ")} `);
      }}
    />
  );
}

/**
 * makeFileActions creates a set of Actions for doing things with the file path
 * of a result.
 */
function makeFileActions(src: Sourcegraph, opts: { path: string; repository: string; revision?: string }) {
  return (
    <ActionPanel.Section key={nanoid()} title="File Actions">
      <Action.CopyToClipboard
        title={"Copy File Path"}
        key={nanoid()}
        content={opts.path}
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
      <Action.OpenInBrowser
        title={"Open File in Browser"}
        key={nanoid()}
        url={`${src.instance}/${opts.repository}${opts.revision ? `@${opts.revision}` : ""}/-/blob/${opts.path}`}
      />
    </ActionPanel.Section>
  );
}

function SearchResultItem({
  searchResult,
  searchText,
  patternType,
  src,
  setSearchText,
}: {
  searchResult: SearchResult;
  searchText: string;
  patternType: PatternType | undefined;
  src: Sourcegraph;
  setSearchText: (text: string) => void;
}) {
  const queryURL = getQueryURL(src, searchText, patternType);
  const { match } = searchResult;

  // Branches is a common property for setting a revision
  let revisions: string[] | undefined;
  let firstRevision: string | undefined;
  if ("branches" in match && match.branches) {
    // Only show interesting branches
    if (match.branches.length === 1 && match.branches[0] !== "HEAD") {
      revisions = match.branches;
      firstRevision = match.branches[0];
    }
  }

  // Title to denote the result
  let title = "";
  // Subtitle to show context about the result
  let subtitle = "";
  // Icon to denote the type of the result
  const icon: Image.ImageLike = { source: Icon.Dot, tintColor: ColorDefault };
  // Repository context for the result. Comes last in accessories.
  let repoAccessory: List.Item.Accessory = { text: "", tooltip: "" };
  if ("repository" in match) {
    repoAccessory = firstRevision
      ? {
          text: `${match.repository}@${firstRevision}`,
          tooltip: `${match.repository}@${firstRevision}`,
        }
      : { text: match.repository, tooltip: match.repository };
  }
  // Additional accessories denoting details about this result.
  const accessories: List.Item.Accessory[] = [];

  // Action to drill down on the search result.
  let drilldownAction: ReactElement | undefined;
  let fileActions: ReactElement | undefined;
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
        icon.source = Icon.CircleEllipsis;
        matchTypeDetails.push("forked");
      }
      if (match.archived) {
        icon.source = Icon.CircleDisabled;
        matchTypeDetails.push("archived");
      }
      if (match.private) {
        icon.source = Icon.CircleProgress100; // looks less imposing than Circle
        icon.tintColor = ColorPrivate;
        matchTypeDetails.push("private");
      } else {
        icon.source = Icon.Circle;
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
      // For a repository result, we don't need the repo accessory to show context about
      // the repo again - we can just show star count if available.
      if (match.repoStars) {
        repoAccessory.text = match.repoStars > 1000 ? `${Math.round(match.repoStars / 1000)}k` : `${match.repoStars}`;
        repoAccessory.icon = Icon.Star;
        repoAccessory.tooltip = `${match.repoStars} stars`;
      } else {
        repoAccessory.text = "";
      }
      drilldownAction = makeDrilldownAction("Search Repository", setSearchText, {
        repository: match.repository,
        revision: firstRevision,
      });
      break;

    case "commit":
      icon.source = Icon.SpeechBubbleActive;
      title = match.message || "No message";
      subtitle = DateTime.fromISO(match.authorDate).toRelative() || match.authorDate;
      subtitleTooltip = match.authorDate;
      matchDetails.push(`by ${match.authorName}`);
      drilldownAction = makeDrilldownAction("Search Revision of Repository", setSearchText, {
        repository: match.repository,
        revision: match.oid, // a commit is always a revision
      });
      break;

    case "path": {
      icon.source = Icon.Document;
      title = match.path;
      const actionOpts = {
        repository: match.repository,
        path: match.path,
        revision: firstRevision,
      };
      drilldownAction = makeDrilldownAction("Search File", setSearchText, actionOpts);
      fileActions = makeFileActions(src, actionOpts);
      break;
    }

    case "content": {
      icon.source = Icon.Paragraph;
      subtitle = match.path;

      // Support both lineMatches and chunkMatches
      if (match.chunkMatches) {
        title = match.chunkMatches
          .map((c) =>
            c.content
              .split("\n")
              .map((l) => l.trim())
              .join(" ... "),
          )
          .join(" ... ");
        matchDetails.push(count(match.chunkMatches?.length, "match", "matches"));
      } else if (match.lineMatches) {
        title = match.lineMatches.map((l) => l.line.trim()).join(" ... ");
        matchDetails.push(count(match.lineMatches.length, "match", "matches"));
      }

      const actionOpts = {
        repository: match.repository,
        path: match.path,
        revision: firstRevision,
      };
      drilldownAction = makeDrilldownAction("Search File", setSearchText, actionOpts);
      fileActions = makeFileActions(src, actionOpts);
      break;
    }

    case "symbol": {
      icon.source = Icon.Code;
      title = match.symbols.map((s) => s.name).join(", ");
      subtitle = match.path;
      matchDetails.push(count(match.symbols.length, "match", "matches"));

      const actionOpts = {
        repository: match.repository,
        path: match.path,
        revision: firstRevision,
      };
      drilldownAction = makeDrilldownAction("Search File", setSearchText, actionOpts);
      fileActions = makeFileActions(src, actionOpts);
      break;
    }

    default:
      icon.source = Icon.Ellipsis;
      icon.tintColor = ColorSubdued;
      title = sentenceCase(match.type);
      subtitle = `${JSON.stringify(match)}`;
      accessories.push({
        icon: {
          source: Icon.QuestionMark,
          tintColor: ColorError,
        },
        tooltip: "Sorry! This result type is unknown to this extension.",
      });
  }

  // Add repo accessory as right-most detail
  if (repoAccessory.text || repoAccessory.icon) {
    accessories.push(repoAccessory);
  }

  return (
    <List.Item
      title={{
        // Just in case, make sure at least SOMETHING is set to the title.
        value: title.slice(0, combinedThreshold) || sentenceCase(match.type),
        tooltip: matchDetails.join(", "),
      }}
      subtitle={{
        value: subtitle.slice(0, combinedThreshold),
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
                icon={{ source: Icon.Maximize }}
              />
            ),
            extraActions: drilldownAction && [drilldownAction],
          })}
          {fileActions || <></>}
          <ActionPanel.Section key={nanoid()} title="Query Actions">
            <Action.OpenInBrowser title="Open Query in Browser" url={queryURL} shortcut={tertiaryActionShortcut} />
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
            {
              // support both chunkMatches and lineMatches
              match.chunkMatches
                ? match.chunkMatches.map((c) => (
                    <List.Item
                      key={nanoid()}
                      title={c.content}
                      accessories={[{ text: `L${c.contentStart.line}` }]}
                      actions={
                        <ActionPanel>
                          {resultActions(urlWithLineNumber(searchResult.url, c.contentStart.line))}
                        </ActionPanel>
                      }
                    />
                  ))
                : match.lineMatches?.map((l) => (
                    <List.Item
                      key={nanoid()}
                      title={l.line}
                      accessories={[{ text: `L${l.lineNumber}` }]}
                      actions={
                        <ActionPanel>{resultActions(urlWithLineNumber(searchResult.url, l.lineNumber))}</ActionPanel>
                      }
                    />
                  ))
            }
          </List.Section>
        </List>
      );

    case "symbol":
      return (
        <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter symbols results">
          <List.Section title={match.path} subtitle={matchTitle}>
            {match.symbols.map((s) => (
              <List.Item
                key={nanoid()}
                title={s.name}
                subtitle={s.containerName}
                accessories={[
                  {
                    tag: {
                      value: s.kind.toLowerCase(),
                      color: ((): Color.ColorLike => {
                        switch (s.kind) {
                          // Functional things
                          case SymbolKind.Function:
                          case SymbolKind.Method:
                          case SymbolKind.Constructor:
                            return "A96AF3"; // Violet-07

                          // Thing-y things
                          case SymbolKind.Class:
                          case SymbolKind.Interface:
                          case SymbolKind.Struct:
                            return ColorEmphasis;

                          // Even more thing-y things
                          case SymbolKind.Module:
                          case SymbolKind.Namespace:
                          case SymbolKind.File:
                          case SymbolKind.Package:
                            return "00A0C8"; // Teal-07
                        }

                        // Everybody else
                        return ColorSubdued;
                      })(),
                    },
                  },
                ]}
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
  let markdownContent = "";
  const metadata: ReactNode[] = [
    <Detail.Metadata.TagList title="Match type" key={nanoid()}>
      <Detail.Metadata.TagList.Item text={sentenceCase(match.type)} icon={icon} />
      {"repoStars" in match && (
        <Detail.Metadata.TagList.Item
          text={`${match.repoStars}`}
          icon={Icon.Star}
          color={Color.Yellow}
          key={nanoid()}
        />
      )}
      {"private" in match && (
        <Detail.Metadata.TagList.Item
          text={match.private ? "Private" : "Public"}
          color={match.private ? ColorPrivate : ColorDefault}
        />
      )}
    </Detail.Metadata.TagList>,
  ];
  if ("repository" in match) {
    metadata.push(
      <Detail.Metadata.Link
        title="Repository"
        text={match.repository}
        target={`https://${match.repository}`}
        key={nanoid()}
      />,
    );
  }

  switch (match.type) {
    // Match types that have multi result view

    case "content":
    case "symbol":
      return <MultiResultView searchResult={{ url: searchResult.url, match }} key={nanoid()} />;

    // Match types that use markdown view

    case "repo":
      markdownContent = `${bold(match.repository)}`;
      if (match.description) {
        markdownContent += ` - ${match.description}\n`;
      }
      if (match.topics) {
        metadata.push(
          <Detail.Metadata.TagList title="Topics" key={nanoid()}>
            {match.topics.map((topic) => (
              <Detail.Metadata.TagList.Item text={topic} color={ColorSubdued} key={nanoid()} />
            ))}
          </Detail.Metadata.TagList>,
        );
      }
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
      metadata.push(
        <Detail.Metadata.Link title="File" text={path.basename(match.path)} key={nanoid()} target={searchResult.url} />,
      );
      markdownContent = `${bold(match.path)}\n\n---\n\n`;
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
        <Detail.Metadata.Link title="Commit" text={match.oid} target={searchResult.url} key={nanoid()} />,
        <Detail.Metadata.Label
          title="Committed"
          text={DateTime.fromISO(match.authorDate).toRelative() || "Unknown"}
          key={nanoid()}
        />,
      );
      break;
    }

    default:
      markdownContent = `${bold(sentenceCase(match.type))}\n\n---\n\nUnsupported result type - full data:\n\n${codeBlock(JSON.stringify(match, null, "  "))}`;
  }

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdownContent}
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
        source: suggestion.query ? Icon.Filter : Icon.ExclamationMark,
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
