import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  randomId,
  PushAction,
  Detail,
  Icon,
  ImageLike,
  copyTextToClipboard,
  ActionPanelItem,
  Toast,
  useNavigation,
  ListSection,
  ListItem,
  KeyboardShortcut,
} from "@raycast/api";
import { useState, useRef, Fragment, useEffect } from "react";
import checkAuthEffect from "../hooks/checkAuthEffect";
import { copyShortcut, secondaryActionShortcut, tertiaryActionShortcut } from "./shortcuts";

import { Sourcegraph, instanceName } from "../sourcegraph";
import { performSearch, SearchResult, Suggestion } from "../sourcegraph/stream-search";
import { ContentMatch, SearchMatch, SymbolMatch } from "../sourcegraph/stream-search/stream";
import { ColorDefault, ColorPrivate } from "./colors";

export default function SearchCommand(src: Sourcegraph) {
  const { state, search } = useSearch(src);
  const srcName = instanceName(src);
  const nav = useNavigation();

  useEffect(checkAuthEffect(src, nav));

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder={`Search ${srcName} ${
        src.defaultContext ? `context ${src.defaultContext}` : `(e.g. 'fmt.Sprintf lang:go')`
      }`}
      throttle
    >
      {/* show suggestions IFF no results */}
      {!state.isLoading && state.results.length === 0 ? (
        <List.Section title="Suggestions" subtitle={state.summary || ""}>
          {state.suggestions.slice(0, 3).map((suggestion) => (
            <SuggestionItem key={randomId()} suggestion={suggestion} />
          ))}

          <Fragment>
            <List.Item
              title={`${state.searchText.length > 0 ? "Continue" : "Compose"} query in browser`}
              icon={{ source: Icon.MagnifyingGlass }}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={getQueryURL(src, state.searchText)} />
                </ActionPanel>
              }
            />
            <List.Item
              title="View search query syntax reference"
              icon={{ source: Icon.Globe }}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url="https://docs.sourcegraph.com/code_search/reference/queries" />
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
          <SearchResultItem key={randomId()} searchResult={searchResult} searchText={state.searchText} src={src} />
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
  actions.push(<OpenInBrowserAction key={randomId()} title="Open Result in Browser" url={url} />);
  if (customActions?.extraActions) {
    actions.push(...customActions.extraActions);
  }
  actions.push(
    // Can't seem to override the shortcut on this thing if it's the second action, so
    // add it as the third action instead.
    <CopyToClipboardAction key={randomId()} title="Copy Link to Result" content={url} shortcut={copyShortcut} />
  );
  return (
    <ActionPanel.Section key={randomId()} title="Result Actions">
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
  let context = match.repository;
  let url = searchResult.url;
  let multiResult = false;

  const icon: ImageLike = { source: Icon.Dot, tintColor: ColorDefault };
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
      context = match.repoStars ? `${match.repoStars} ★` : "";
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
      if (match.lineMatches.length === 1) {
        url = `${searchResult.url}?L${match.lineMatches[0].lineNumber}`;
      } else {
        multiResult = true;
      }
      break;
    case "symbol":
      icon.source = Icon.Link;
      title = match.symbols.map((s) => s.name).join(", ");
      subtitle = match.path;
      if (match.symbols.length === 1) {
        url = `${searchResult.url}${match.symbols[0].url}`;
      } else {
        multiResult = true;
      }
      break;
  }

  const peekAction = (shortcut?: KeyboardShortcut) => (
    <PushAction
      key={randomId()}
      title="Peek Result Details"
      target={<PeekSearchResult searchResult={searchResult} />}
      shortcut={shortcut}
      icon={{ source: Icon.MagnifyingGlass }}
    />
  );
  const customActions: CustomResultActions = {};
  if (multiResult) {
    customActions.openAction = peekAction();
  } else {
    customActions.extraActions = [peekAction(secondaryActionShortcut)];
  }

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessoryTitle={context}
      icon={icon}
      accessoryIcon={multiResult ? { source: Icon.ArrowRight } : undefined}
      actions={
        <ActionPanel>
          {resultActions(url, customActions)}
          <ActionPanel.Section key={randomId()} title="Query Actions">
            <OpenInBrowserAction title="Open Query" url={queryURL} shortcut={tertiaryActionShortcut} />
            <CopyToClipboardAction title="Copy Link to Query" content={queryURL} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function MultiResultPeek({ searchResult }: { searchResult: { url: string; match: ContentMatch | SymbolMatch } }) {
  const { match } = searchResult;
  const navigationTitle = `Peek ${match.type} results`;
  const matchTitle = `${match.repository} ${match.repoStars ? `- ${match.repoStars} ★` : ""}`;

  // Match types with expanded peek support
  switch (match.type) {
    case "content":
      return (
        <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter matches">
          <ListSection title={match.path} subtitle={matchTitle}>
            {match.lineMatches.map((l) => (
              <ListItem
                key={randomId()}
                title={l.line}
                accessoryTitle={`L${l.lineNumber}`}
                actions={<ActionPanel>{resultActions(`${searchResult.url}?L${l.lineNumber}`)}</ActionPanel>}
              />
            ))}
          </ListSection>
        </List>
      );

    case "symbol":
      return (
        <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter symbols">
          <ListSection title={match.path} subtitle={matchTitle}>
            {match.symbols.map((s) => (
              <ListItem
                key={randomId()}
                title={s.name}
                subtitle={s.containerName}
                accessoryTitle={s.kind.toLowerCase()}
                actions={<ActionPanel>{resultActions(`${searchResult.url}${s.url}`)}</ActionPanel>}
              />
            ))}
          </ListSection>
        </List>
      );
  }
}

function PeekSearchResult({ searchResult }: { searchResult: SearchResult }) {
  const { match } = searchResult;
  const navigationTitle = `Peek ${match.type} result`;
  const matchTitle = `**${match.repository}** ${match.repoStars ? `- ${match.repoStars} ★` : ""}`;

  // Match types that use markdown view support
  let markdownContent = "";
  switch (match.type) {
    case "content":
    case "symbol":
      return <MultiResultPeek searchResult={{ url: searchResult.url, match }} />;

    case "repo":
      markdownContent = `> ${match.private ? "Private" : "Public"} ${match.type} match
  
---

${match.description || ""}`;
      break;

    case "path":
      markdownContent = `> ${match.type} match

---

\`${match.path}\`
`;
      break;

    case "commit":
      markdownContent = `> ${match.type} match in ${match.detail}
  
---

${match.label}

${match.content}
`;
      break;

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
      markdown={`${matchTitle}\n\n${markdownContent}`}
      actions={<ActionPanel>{resultActions(searchResult.url)}</ActionPanel>}
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
            <ActionPanelItem
              title="Copy Suggestion"
              onAction={async () => {
                await copyTextToClipboard(` ${suggestion.query}`);
                showToast(ToastStyle.Success, "Suggestion copied - paste it to continue searching!");
              }}
            />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <PushAction
              key={randomId()}
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
  searchText: string;
  results: SearchResult[];
  suggestions: Suggestion[];
  summary: string | null;
  isLoading: boolean;
}

const containsFilterRegex = new RegExp(/context:\S+/);

function useSearch(src: Sourcegraph) {
  const [state, setState] = useState<SearchState>({
    searchText: "",
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

    // inject context if not overwridden
    if (src.defaultContext && !containsFilterRegex.test(searchText)) {
      searchText = `context:${src.defaultContext} ${searchText}`;
    }

    try {
      setState((oldState) => ({
        ...oldState,
        searchText,
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
          new Toast({
            style: ToastStyle.Failure,
            title: alert.title,
            primaryAction: {
              title: "View details",
              onAction: () => {
                push(<Detail markdown={`**${alert.title}**\n\n${alert.description}`} navigationTitle="Alert" />);
              },
            },
          }).show();
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
      new Toast({
        style: ToastStyle.Failure,
        title: "Search failed",
        message: String(error),
        primaryAction: {
          title: "View details",
          onAction: () => {
            push(<Detail markdown={`**Search failed:** ${String(error)}`} navigationTitle="Unexpected error" />);
          },
        },
      }).show();

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
