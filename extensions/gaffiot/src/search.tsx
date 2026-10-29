import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ensureData, isDataReady } from "./data";
import { Entry, Match, displayTitle, gloss, readBody, search, toMarkdown, toPlainText } from "./dictionary";
import { GAFFIOT_SOURCE_URL } from "./legal";
import { LegalAction } from "./legal-view";

const ONLINE_LOOKUP = (word: string) => `https://www.lexilogos.com/latin/gaffiot.php?q=${encodeURIComponent(word)}`;

const bodyCache = new Map<number, string>();
function getBody(entry: Entry): string {
  let body = bodyCache.get(entry.id);
  if (body === undefined) {
    body = readBody(entry);
    bodyCache.set(entry.id, body);
  }
  return body;
}

/** Vedette sans diacritiques de quantité, pour la recherche en ligne et la copie « propre ». */
function bareTitle(entry: Entry): string {
  return entry.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  // Types générés depuis package.json (raycast-env.d.ts)
  const prefs = getPreferenceValues<Preferences.Search>();
  const limit = Number(prefs.maxResults) || 60;

  const [searchText, setSearchText] = useState(props.arguments?.query ?? props.fallbackText ?? "");
  const [showDetail, setShowDetail] = useState(prefs.showDetail);

  // Premier lancement : téléchargement + conversion des données (le toast de data.ts rend compte des erreurs)
  const [alreadyInstalled] = useState(isDataReady);
  const {
    data: installed,
    isLoading,
    error,
    revalidate,
  } = usePromise(ensureData, [], {
    execute: !alreadyInstalled,
    onError: () => undefined,
  });
  const ready = alreadyInstalled || installed === true;

  const matches = useMemo<Match[]>(() => (ready ? search(searchText, limit) : []), [ready, searchText, limit]);
  const hasQuery = searchText.trim().length > 0;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Latin word (macrons, i/j and u/v are ignored)…"
      filtering={false}
      throttle
      isLoading={isLoading}
      isShowingDetail={showDetail && matches.length > 0}
    >
      {!ready && !error && (
        <List.EmptyView
          icon={Icon.Download}
          title="Preparing the Gaffiot…"
          description="First launch only: the Gaffiot 2016 source file (27 MB) is downloaded from GitHub and converted on your Mac for offline use."
          actions={
            <ActionPanel>
              <LegalAction />
            </ActionPanel>
          }
        />
      )}
      {!ready && error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Download the Gaffiot"
          description={`${error.message}. Check your internet connection and try again (↩).`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={revalidate} />
              <LegalAction />
            </ActionPanel>
          }
        />
      )}
      {ready && !hasQuery && (
        <List.EmptyView
          icon={Icon.Book}
          title="Gaffiot 2016 — Latin → French"
          description="Type a Latin word. Vowel length (ā, ă), case and the i/j, u/v spellings are ignored. Data © Gérard Gréco 2016, CC BY-NC-ND 4.0 (⌘I)."
          actions={
            <ActionPanel>
              <LegalAction />
            </ActionPanel>
          }
        />
      )}
      {ready && hasQuery && matches.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Entries"
          description={`"${searchText}" is not a Gaffiot headword. Try the nominative or the present infinitive: the dictionary doesn't lemmatize inflected forms.`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Search Online (Lexilogos)" url={ONLINE_LOOKUP(searchText)} />
              <LegalAction />
            </ActionPanel>
          }
        />
      )}
      {sections(matches).map(({ title, items }) => (
        <List.Section key={title} title={title} subtitle={`${items.length}`}>
          {items.map(({ entry }) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              showDetail={showDetail}
              onToggleDetail={() => setShowDetail((v) => !v)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function sections(matches: Match[]): { title: string; items: Match[] }[] {
  const groups: Record<Match["kind"], Match[]> = { exact: [], prefix: [], contains: [] };
  for (const m of matches) groups[m.kind].push(m);
  return [
    { title: "Exact Headword", items: groups.exact },
    { title: "Starts With", items: groups.prefix },
    { title: "Contains", items: groups.contains },
  ].filter((s) => s.items.length > 0);
}

function EntryItem({
  entry,
  showDetail,
  onToggleDetail,
}: {
  entry: Entry;
  showDetail: boolean;
  onToggleDetail: () => void;
}) {
  const body = getBody(entry);
  const markdown = toMarkdown(entry, body);
  const title = displayTitle(entry);
  const plain = toPlainText(markdown);

  return (
    <List.Item
      id={String(entry.id)}
      title={title}
      subtitle={showDetail ? undefined : gloss(body)}
      keywords={[entry.key]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={title}>
            <Action
              title={showDetail ? "Hide Entry" : "Show Entry"}
              icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action.CopyToClipboard title="Copy Entry as Text" content={plain} />
            <Action.CopyToClipboard
              title="Copy Entry as Markdown"
              content={markdown}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Headword with Vowel Lengths"
              content={entry.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.Paste
              title="Paste First Line"
              content={`${entry.title} — ${gloss(body, 200)}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Online">
            <Action.OpenInBrowser
              title="Open in Lexilogos"
              url={ONLINE_LOOKUP(bareTitle(entry))}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.OpenInBrowser title="Open Gaffiot 2016 Source" icon={Icon.Globe} url={GAFFIOT_SOURCE_URL} />
          </ActionPanel.Section>
          <ActionPanel.Section title="License">
            <LegalAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
