import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import {
  autosuggestUrl,
  bangSearchUrl,
  hasToken,
  hostname,
  kagiSearch,
  parseSuggestions,
  searchPageUrl,
  snippetToMarkdown,
} from "./kagi";

export default function Command(props: LaunchProps) {
  const initial = props.fallbackText || "";
  const [text, setText] = useState(initial);
  const [submitted, setSubmitted] = useState("");
  const tokenSet = hasToken();

  // Debounce the text that drives autosuggest so we don't fire a request per keystroke.
  const [debounced, setDebounced] = useState(initial);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(id);
  }, [text]);

  // Free, runs as you type (debounced; only while no search has been submitted).
  const { data: suggestions = [] } = usePromise(
    async (q: string) => {
      if (!q.trim()) return [];
      try {
        const res = await fetch(autosuggestUrl(q));
        return parseSuggestions(await res.json());
      } catch {
        return []; // autosuggest is best-effort; never block the UI
      }
    },
    [debounced],
    { execute: submitted === "" },
  );

  // Paid, runs only when `submitted` is set (i.e. on Enter via an action).
  const {
    data: results,
    isLoading: searching,
    error,
  } = usePromise((q: string) => kagiSearch(q), [submitted], { execute: submitted.trim().length > 0 });

  function onText(t: string) {
    setText(t);
    if (submitted) setSubmitted(""); // editing returns to suggestion mode
  }

  // Suggestion list = the raw text + autosuggest, de-duplicated.
  const queries = [text.trim(), ...suggestions].filter((s, i, a) => s && a.indexOf(s) === i);

  function suggestionActions(q: string) {
    return (
      <ActionPanel>
        {tokenSet ? (
          <Action title="Search Kagi" icon={Icon.MagnifyingGlass} onAction={() => setSubmitted(q)} />
        ) : (
          <Action.OpenInBrowser title="Search in Browser" icon={Icon.Globe} url={searchPageUrl(q)} />
        )}
        <Action.OpenInBrowser
          title="Research"
          icon={Icon.Book}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          url={bangSearchUrl("research", q)}
        />
        {tokenSet && <Action.OpenInBrowser title="Open in Kagi (Browser)" icon={Icon.Globe} url={searchPageUrl(q)} />}
        <Action.CreateQuicklink
          title="Create Kagi Search Quicklink"
          icon={Icon.Link}
          quicklink={{ name: "Kagi Search", link: `${searchPageUrl("")}{Query}` }}
        />
      </ActionPanel>
    );
  }

  const newSearch = (
    <Action
      title="New Search"
      icon={Icon.MagnifyingGlass}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => {
        setText("");
        setSubmitted("");
      }}
    />
  );

  return (
    <List
      isLoading={searching}
      searchText={text}
      onSearchTextChange={onText}
      searchBarPlaceholder="Search Kagi…"
      isShowingDetail={Boolean(submitted && !searching && results?.length)}
    >
      {!submitted ? (
        // Suggestion mode (free autosuggest as you type)
        queries.length ? (
          <List.Section title={tokenSet ? "↩ Search · ⌘⇧R Research" : "No API token · ↩ opens browser · ⌘⇧R Research"}>
            {queries.map((q) => (
              <List.Item key={q} icon={Icon.MagnifyingGlass} title={q} actions={suggestionActions(q)} />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search Kagi"
            description={
              tokenSet
                ? "Type a query. Suggestions are free; search runs (billed) on ↩; ⌘⇧R researches with !research."
                : "Type a query and press ↩ to open it in your browser. Add an API token in preferences for in-app results."
            }
          />
        )
      ) : searching ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={`Searching “${submitted}”…`} />
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Search failed"
          description={error.message}
          actions={<ActionPanel>{newSearch}</ActionPanel>}
        />
      ) : results?.length ? (
        <List.Section title={`Results for “${submitted}”`}>
          {results.map((r, i) => (
            <List.Item
              key={`${r.url}-${i}`}
              icon={r.url ? getFavicon(r.url, { fallback: Icon.Globe }) : Icon.Globe}
              title={r.title}
              subtitle={hostname(r.url)}
              detail={
                <List.Item.Detail
                  markdown={`### ${r.title}\n\n${snippetToMarkdown(r.snippet)}\n\n[${hostname(r.url)}](${r.url})`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser icon={Icon.Globe} url={r.url} />
                  <Action.CopyToClipboard title="Copy URL" icon={Icon.Clipboard} content={r.url} />
                  <Action.OpenInBrowser
                    title="Research"
                    icon={Icon.Book}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    url={bangSearchUrl("research", submitted)}
                  />
                  {newSearch}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`No results for “${submitted}”`}
          description="Try a different query."
          actions={<ActionPanel>{newSearch}</ActionPanel>}
        />
      )}
    </List>
  );
}
