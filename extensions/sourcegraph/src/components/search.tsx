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
  Color,
  Icon,
  ImageLike,
  copyTextToClipboard,
  ActionPanelItem,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useRef, Fragment, useEffect } from "react";

import { Sourcegraph, instanceName } from "../sourcegraph";
import { performSearch, SearchResult, Suggestion } from "../sourcegraph/stream-search";
import { AuthError, checkAuth } from "../sourcegraph/gql";

export default function SearchCommand(src: Sourcegraph) {
  const { push } = useNavigation();
  const { state, search } = useSearch(src);
  const srcName = instanceName(src);

  useEffect(() => {
    async function checkSrc() {
      try {
        if (src.token) {
          await checkAuth(src);
        }
      } catch (err) {
        const toast =
          err instanceof AuthError
            ? new Toast({
                title: `Failed to authenticate against ${srcName}`,
                message: err.message,
                style: ToastStyle.Failure,
              })
            : new Toast({
                title: `Error authenticating against ${srcName}`,
                message: JSON.stringify(err),
                style: ToastStyle.Failure,
              });
        (toast.primaryAction = {
          title: "View details",
          onAction: () => {
            push(
              <Detail
                navigationTitle="Error"
                markdown={`**${toast.title}:** ${toast.message}.

This may be an issue with your configuration - try updating the Sourcegraph extension settings!`}
              />
            );
          },
        }),
          await toast.show();
      }
    }
    checkSrc();
  });

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
              title="View search query syntax reference"
              icon={{ source: Icon.Globe }}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url="https://docs.sourcegraph.com/code_search/reference/queries" />
                </ActionPanel>
              }
            />
            <List.Item
              title={`${state.searchText.length > 0 ? "Continue" : "Compose"} query in browser`}
              icon={{ source: Icon.MagnifyingGlass }}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={getQueryURL(src, state.searchText)} />
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

function resultActions(searchResult: SearchResult, extraActions?: JSX.Element[]) {
  const actions: JSX.Element[] = [<OpenInBrowserAction key={randomId()} title="Open Result" url={searchResult.url} />];
  if (extraActions) {
    actions.push(...extraActions);
  }
  actions.push(
    // Can't seem to override the shortcut on this thing if it's the second action, so
    // add it as the third action instead.
    <CopyToClipboardAction
      key={randomId()}
      title="Copy Link to Result"
      content={searchResult.url}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
    />
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

  const icon: ImageLike = { source: Icon.Dot, tintColor: Color.Blue };
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
        icon.tintColor = Color.Yellow;
      }
      title = match.repository;
      subtitle = match.description || "";
      context = match.repoStars ? `${match.repoStars} stars` : "";
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

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessoryTitle={context}
      icon={icon}
      actions={
        <ActionPanel>
          {resultActions(searchResult, [
            <PushAction
              key={randomId()}
              title="Peek Result Details"
              target={<PeekSearchResult searchResult={searchResult} src={src} />}
              icon={{ source: Icon.MagnifyingGlass }}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />,
          ])}
          <ActionPanel.Section key={randomId()} title="Query Actions">
            <OpenInBrowserAction
              title="Open Query"
              url={queryURL}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
            />
            <CopyToClipboardAction title="Copy Link to Query" content={queryURL} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PeekSearchResult({ searchResult, src }: { searchResult: SearchResult; src: Sourcegraph }) {
  const { match } = searchResult;
  const title = `**${match.repository}** ${match.repoStars ? `| ${match.repoStars} stars` : ""}`;

  let body = "";
  switch (match.type) {
    case "repo":
      body = `${title}
  
  > ${match.private ? "Private" : "Public"} ${match.type} match
  
  ---
  
  ${match.description || ""}`;
      break;

    case "content":
      body = `${title}
  
  > ${match.type} match in \`${match.path}\`
  
  ---
  
  ${match.lineMatches
    .map(
      (l) => `[Line ${l.lineNumber}](${searchResult.url}?${l.lineNumber})\n\`\`\`
  ${l.line}
  \`\`\``
    )
    .join("\n\n")}`;
      break;

    case "symbol":
      body = `${title}
  
  > ${match.type} match in \`${match.path}\`
  
  ---
  
  ${match.symbols
    .map((s) => `- [\`${s.containerName ? `${s.containerName} > ` : ""}${s.name}\`](${src.instance}${s.url})`)
    .join("\n")}`;
      break;

    case "path":
      body = `${title}
        
  > ${match.type} match
  
  ---
  
  \`${match.path}\`
  `;
      break;

    case "commit":
      body = `${title}
  
  > ${match.type} match in ${match.detail}
  
  ---
  
  ${match.label}
  
  ${match.content}
  `;
      break;

    default:
      body = `Unsupported result type - full data:
  
  \`\`\`
  ${JSON.stringify(match, null, "  ")}
  \`\`\`
  `;
  }

  return (
    <Detail
      navigationTitle={`Peek ${match.type} result`}
      markdown={body}
      actions={<ActionPanel>{resultActions(searchResult)}</ActionPanel>}
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
      await performSearch(searchText, src, cancelRef.current.signal, {
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
      showToast(ToastStyle.Failure, "Search failed", String(error));

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
