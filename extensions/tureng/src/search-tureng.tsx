import { ActionPanel, Action, Icon, List, showToast, Toast, open, Clipboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { lookup, LookupResponse, LookupResponseItem } from "./tureng-api";
import { addFavorite } from "./favorites";

function formatAllTranslations(data: LookupResponse): string {
  const lines: string[] = [];
  if (data.enToTR.length > 0) {
    lines.push("EN → TR");
    for (const item of data.enToTR) {
      lines.push(`  ${item.term} (${item.category}) [${item.type}]`);
    }
  }
  if (data.trToEN.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("TR → EN");
    for (const item of data.trToEN) {
      lines.push(`  ${item.term} (${item.category}) [${item.type}]`);
    }
  }
  return lines.join("\n");
}

export function TranslationResult({ word }: { word: string }) {
  const { data, isLoading } = usePromise(lookup, [word]);

  const hasResults = data && (data.enToTR.length > 0 || data.trToEN.length > 0);
  const hasSuggestions = data && data.suggestions.length > 0;

  return (
    <List isLoading={isLoading} navigationTitle={word}>
      {hasResults && (
        <>
          <List.Section title="EN → TR">
            {data.enToTR.map((item, index) => (
              <TranslationItem key={`en-${index}`} item={item} word={word} data={data} />
            ))}
          </List.Section>
          <List.Section title="TR → EN">
            {data.trToEN.map((item, index) => (
              <TranslationItem key={`tr-${index}`} item={item} word={word} data={data} />
            ))}
          </List.Section>
        </>
      )}
      {!hasResults && hasSuggestions && (
        <List.Section title="Did you mean?">
          {data.suggestions.map((suggestion) => (
            <List.Item
              key={suggestion}
              icon={Icon.QuestionMarkCircle}
              title={suggestion}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Look up This Term"
                    icon={Icon.MagnifyingGlass}
                    target={<TranslationResult word={suggestion} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!isLoading && !hasResults && !hasSuggestions && (
        <List.EmptyView icon={Icon.XMarkCircle} title="No results found" />
      )}
    </List>
  );
}

function TranslationItem({ item, word, data }: { item: LookupResponseItem; word: string; data: LookupResponse }) {
  return (
    <List.Item
      icon={Icon.Book}
      title={item.term}
      subtitle={item.category}
      accessories={[{ text: item.type }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Look up This Term"
            icon={Icon.MagnifyingGlass}
            target={<TranslationResult word={item.term} />}
          />
          <Action.CopyToClipboard title="Copy Term" content={item.term} />
          <Action
            title="Paste Translation"
            icon={Icon.TextInput}
            shortcut={{ modifiers: ["shift"], key: "return" }}
            onAction={async () => {
              await Clipboard.paste(item.term);
            }}
          />
          <Action.OpenInBrowser
            title="Open Tureng Page in Browser"
            url={`https://tureng.com/en/turkish-english/${encodeURIComponent(item.term)}`}
            shortcut={{ modifiers: ["opt"], key: "return" }}
          />
          <Action.CopyToClipboard
            title="Copy All Translations"
            icon={Icon.Clipboard}
            content={formatAllTranslations(data)}
            shortcut={{ modifiers: ["cmd", "shift", "alt"], key: "c" }}
          />
          {data.voiceURLs.length > 0 ? (
            <Action
              title="Open Pronunciation"
              icon={Icon.Speaker}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => open(data.voiceURLs[0])}
            />
          ) : null}
          <Action
            title="Add to Favorites"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              await addFavorite(word);
              await showToast({ style: Toast.Style.Success, title: `Added "${word}" to favorites` });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command({ arguments: { query } }: { arguments: { query: string } }) {
  return <TranslationResult word={query} />;
}
