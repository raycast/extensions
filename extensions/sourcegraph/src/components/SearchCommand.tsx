import {
  ActionPanel,
  List,
  Action,
  showToast,
  Detail,
  Icon,
  Image,
  Clipboard,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useRef, Fragment } from "react";
import { nanoid } from "nanoid";
import { DateTime } from "luxon";

import { Sourcegraph, instanceName } from "../sourcegraph";
import { performSearch, SearchResult, Suggestion } from "../sourcegraph/stream-search";
import { ContentMatch, SymbolMatch } from "../sourcegraph/stream-search/stream";
import { ColorDefault, ColorPrivate } from "./colors";
import ExpandableErrorToast from "./ExpandableErrorToast";
import { copyShortcut, tertiaryActionShortcut } from "./shortcuts";

/**
 * SearchCommand is the shared search command implementation.
 */
export default function SearchCommand({ src }: { src: Sourcegraph }) {
  const [searchText, updateSearchText] = useState(src.defaultContext ? `context:${src.defaultContext} ` : "");
  const { state, search } = useSearch(src);
  const srcName = instanceName(src);
  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => {
        updateSearchText(text);
        search(text);
      }}
      searchText={searchText}
      searchBarPlaceholder={`Search ${srcName} (e.g. 'fmt.Sprintf lang:go')`}
      throttle
    >
      {/* show suggestions IFF no results */}
      {!state.isLoading && state.results.length === 0 ? (
        <List.Section title="Suggestions" subtitle={state.summary || ""}>
          {state.suggestions.slice(0, 3).map((suggestion) => (
            <SuggestionItem key={nanoid()} suggestion={suggestion} />
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
              icon={{ source: Icon.Globe }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url="https://docs.sourcegraph.com/code_search/reference/queries" />
                </ActionPanel>
              }
            />
          </Fragment>
        </List.Section>
      ) : (
        <Fragment />
      )}

      {/* results */}
      <List.Section title="Results" subtitle={state.summary || ""}>
        {state.results.map((searchResult) => (
          <SearchResultItem key={nanoid()} searchResult={searchResult} searchText={searchText} src={src} />
        ))}
      </List.Section>
    </List>
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
  return `${src.instance}?q=${encodeURIComponent(query)}`;
}

function SearchResultItem({
  searchResult,
  searchText,
  src,
}: {
  searchResult: SearchResult;
  searchText: string;
  src: Sourcegraph;
}) {
  const queryURL = getQueryURL(src, searchText);

  const { match } = searchResult;
  let title = "";
  let subtitle = "";
  const accessory: List.Item.Accessory = { text: match.repository };

  const icon: Image.ImageLike = { source: Icon.Dot, tintColor: ColorDefault };
  switch (match.type) {
    case "repo":
      if (match.fork) {
        icon.source = Icon.Circle;
      }
      if (match.archived) {
        icon.source = Icon.XmarkCircle;
      }
      // TODO color results of all matches based on repo privacy
      if (match.private) {
        icon.tintColor = ColorPrivate;
      }
      title = match.repository;
      subtitle = match.description || "";
      if (match.repoStars) {
        accessory.text = `${match.repoStars}`;
        accessory.icon = Icon.Star;
      } else {
        accessory.text = "";
      }
      break;
    case "commit":
      icon.source = Icon.MemoryChip;
      title = match.label;
      // just get the date
      subtitle = match.detail.split(" ").slice(1).join(" ");
      break;
    case "path":
      icon.source = Icon.TextDocument;
      title = match.path;
      break;
    case "content":
      icon.source = Icon.Text;
      title = match.lineMatches.map((l) => l.line.trim()).join(" ... ");
      subtitle = match.path;
      break;
    case "symbol":
      icon.source = Icon.Link;
      title = match.symbols.map((s) => s.name).join(", ");
      subtitle = match.path;
      break;
  }

  const accessories: List.Item.Accessory[] = [];
  if (accessory.text || accessory.icon) {
    accessories.push(accessory);
  }

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      icon={icon}
      actions={
        <ActionPanel>
          {resultActions(searchResult.url, {
            openAction: (
              <Action.Push
                key={nanoid()}
                title="View Result"
                target={<ResultView searchResult={searchResult} icon={icon} />}
                icon={{ source: Icon.MagnifyingGlass }}
              />
            ),
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
                actions={<ActionPanel>{resultActions(`${searchResult.url}?L${l.lineNumber}`)}</ActionPanel>}
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
                actions={<ActionPanel>{resultActions(`${searchResult.url}#${s.url}`)}</ActionPanel>}
              />
            ))}
          </List.Section>
        </List>
      );
  }
}

function ResultView({ searchResult, icon }: { searchResult: SearchResult; icon: Image.ImageLike }) {
  const { match } = searchResult;
  const navigationTitle = `View ${match.type} result`;

  const markdownTitle = `**${match.repository}**`;
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
  if (match.repoStars) {
    metadata.push(<Detail.Metadata.Label title="Stars" text={`${match.repoStars}`} key={nanoid()} />);
  }

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
      break;

    case "path":
      markdownContent = `\`${match.path}\``;
      break;

    case "commit": {
      markdownContent = `${match.label}

${match.content}
`;
      const detailParts = match.detail.split(" ");
      if (detailParts.length > 1) {
        metadata.push(
          <Detail.Metadata.Label title="Commit" text={detailParts[0]} key={nanoid()} />,
          <Detail.Metadata.Label title="Committed" text={detailParts.splice(1).join(" ")} key={nanoid()} />
        );
      } else {
        metadata.push(<Detail.Metadata.Label title="Details" text={match.detail} key={nanoid()} />);
      }
      break;
    }

    default:
      markdownContent = `Unsupported result type - full data:

\`\`\`
${JSON.stringify(match, null, "  ")}
\`\`\`
`;
  }

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={`${markdownTitle}\n\n${markdownContent}`}
      actions={<ActionPanel>{resultActions(searchResult.url)}</ActionPanel>}
      metadata={<Detail.Metadata>{metadata}</Detail.Metadata>}
    ></Detail>
  );
}

function SuggestionItem({ suggestion }: { suggestion: Suggestion }) {
  return (
    <List.Item
      title={suggestion.title}
      subtitle={suggestion.description}
      icon={{ source: suggestion.query ? Icon.Clipboard : Icon.ExclamationMark }}
      actions={
        suggestion.query ? (
          <ActionPanel>
            <Action
              title="Copy Suggestion"
              onAction={async () => {
                await Clipboard.copy(` ${suggestion.query}`);
                showToast(Toast.Style.Success, "Suggestion copied - paste it to continue searching!");
              }}
            />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <Action.Push
              key={nanoid()}
              title="View Suggestion"
              target={
                <Detail
                  markdown={`${suggestion.title}${suggestion.description ? `\n\n${suggestion.description}` : ""}`}
                  navigationTitle="Suggestion"
                />
              }
              icon={{ source: Icon.MagnifyingGlass }}
            />
          </ActionPanel>
        )
      }
    />
  );
}

interface SearchState {
  results: SearchResult[];
  suggestions: Suggestion[];
  summary: string | null;
  isLoading: boolean;
}

function useSearch(src: Sourcegraph) {
  const [state, setState] = useState<SearchState>({
    results: [],
    suggestions: [],
    summary: "",
    isLoading: false,
  });
  const cancelRef = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      setState((oldState) => ({
        ...oldState,
        results: [],
        suggestions: [],
        summary: null,
        isLoading: true,
      }));
      await performSearch(cancelRef.current.signal, src, searchText, {
        onResults: (results) => {
          setState((oldState) => ({
            ...oldState,
            results: oldState.results.concat(results),
          }));
        },
        onSuggestions: (suggestions, pushToTop) => {
          setState((oldState) => ({
            ...oldState,
            suggestions: pushToTop
              ? suggestions.concat(oldState.suggestions)
              : oldState.suggestions.concat(suggestions),
          }));
        },
        onAlert: (alert) => {
          ExpandableErrorToast(push, "Alert", alert.title, alert.description || "").show();
        },
        onProgress: (progress) => {
          setState((oldState) => ({
            ...oldState,
            summary: `${progress.matchCount} results in ${progress.duration}`,
          }));
        },
      });
      setState((oldState) => ({
        ...oldState,
        isLoading: false,
      }));
    } catch (error) {
      ExpandableErrorToast(push, "Unexpected error", "Search failed", String(error)).show();

      setState((oldState) => ({
        ...oldState,
        isLoading: false,
      }));
    }
  }

  return {
    state: state,
    search: search,
  };
}
