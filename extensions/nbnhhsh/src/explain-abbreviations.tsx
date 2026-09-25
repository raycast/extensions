import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { normalizeQuery, websiteUrl } from "./lib/lookup";
import { useLookup } from "./lib/use-lookup";

function LookupActions({ query, retry, meaning }: { query: string; retry: () => void; meaning?: string }) {
  return (
    <ActionPanel>
      {meaning !== undefined && (
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Meaning" content={meaning} />
          <Action.Paste title="Paste Meaning" content={meaning} shortcut={{ modifiers: ["cmd"], key: "return" }} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {query && (
          <Action
            title="Retry Lookup"
            icon={Icon.ArrowClockwise}
            onAction={retry}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        )}
        <Action.OpenInBrowser
          title="Open in Browser"
          url={websiteUrl(query)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = normalizeQuery(searchText);
  const { groups, error, isLoading, retry } = useLookup(query);
  const hasMeanings = groups?.some((group) => group.meanings.length);

  let emptyTitle = "Explain Chinese Abbreviations";
  let emptyDescription = "Type or paste an abbreviation, such as yyds, nsdd, or awsl.";
  if (searchText.trim() && !query) {
    emptyTitle = "No Abbreviations Found";
    emptyDescription = "Use at least two letters or digits, such as yyds. Separate multiple abbreviations with spaces.";
  } else if (isLoading) {
    emptyTitle = "Looking Up Abbreviations…";
    emptyDescription = "Finding possible meanings on nbnhhsh.";
  } else if (error) {
    emptyTitle = "Could Not Look Up Abbreviations";
    emptyDescription = error;
  } else if (groups) {
    emptyTitle = "No Meanings Found";
    emptyDescription = `No meanings were returned for ${query.replaceAll(",", ", ")}. Try another abbreviation or open the website.`;
  }

  return (
    <List
      searchBarPlaceholder="Type abbreviations, e.g. yyds nsdd…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      isLoading={isLoading}
    >
      {hasMeanings ? (
        groups?.map((group) => (
          <List.Section
            key={group.name}
            title={group.name}
            subtitle={group.kind === "suggestion" ? "Possible suggestions" : "Possible meanings"}
          >
            {group.meanings.length ? (
              group.meanings.map((meaning, index) => (
                <List.Item
                  key={`${group.name}-${index}`}
                  title={meaning}
                  icon={group.kind === "suggestion" ? Icon.QuestionMarkCircle : Icon.Text}
                  accessories={
                    group.kind === "suggestion" ? [{ tag: { value: "Tentative", color: Color.Orange } }] : []
                  }
                  actions={<LookupActions query={group.name} meaning={meaning} retry={retry} />}
                />
              ))
            ) : (
              <List.Item
                title="No meanings found"
                subtitle={group.name}
                icon={Icon.MagnifyingGlass}
                actions={<LookupActions query={group.name} retry={retry} />}
              />
            )}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          actions={isLoading ? undefined : <LookupActions query={query} retry={retry} />}
        />
      )}
    </List>
  );
}
