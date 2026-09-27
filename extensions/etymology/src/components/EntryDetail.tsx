// The one detail view, shared by all three commands and pushed recursively.
//
// Following an ancestor pushes another EntryDetail for that term in that
// language, which is the whole interaction: the word is a door, not a leaf.
//
// The metadata pane complements the tree rather than restating it. It used to
// list the chain as tags beside a tree that drew the same chain, which spent the
// whole right-hand column saying a second time what the left already said.

import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EtymNode } from "../model";
import { loadEntry, reloadEntry } from "../entry";
import { earliest, entryMarkdown, relationKey } from "../render";
import { pageUrl } from "../sources";
import { etymonlineFooter, etymonlineUrl } from "../etymonline";
import { languageName } from "../langcodes";
import { EntryActions } from "./EntryActions";
import * as favorites from "../favorites";

interface Props {
  term: string;
  lang?: string;
}

export function EntryDetail({ term, lang = "en" }: Props) {
  const [view, setView] = useState(getPreferenceValues<Preferences>().defaultView);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: entry, isLoading, error, mutate, revalidate } = useCachedPromise(loadEntry, [term, lang]);

  useEffect(() => {
    favorites.has({ term, lang, langName: "" }).then(setIsFavorite);
  }, [term, lang]);

  const toggleFavorite = async (favorite: favorites.Favorite) => {
    if (isFavorite) {
      await favorites.remove(favorite);
      setIsFavorite(false);
      await showToast({ style: Toast.Style.Success, title: `Unpinned ${favorite.term}` });
    } else {
      await favorites.add(favorite);
      setIsFavorite(true);
      await showToast({ style: Toast.Style.Success, title: `Pinned ${favorite.term}` });
    }
  };

  const reload = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Refreshing" });
    await mutate(reloadEntry(term, lang));
    await showToast({ style: Toast.Style.Success, title: "Refreshed" });
  };

  // A failed lookup used to land here silently: isLoading false, entry empty, so
  // the pane showed the bare word and no actions at all - not even a retry.
  if (error && !entry) {
    return (
      <Detail
        navigationTitle={term}
        markdown={[
          `# ${term}`,
          "Could not reach Wiktionary.",
          `\`${error.message}\``,
          "Retry with ⌘R, or open the page in a browser.",
        ].join("\n\n")}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action.OpenInBrowser
              title="Open in Wiktionary"
              url={pageUrl(term, languageName(lang))}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.OpenInBrowser
              title="Open in Etymonline"
              url={etymonlineUrl(term)}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!entry) {
    return <Detail isLoading={isLoading} markdown={`# ${term}`} navigationTitle={term} />;
  }

  const tree = entry.sections.find((s) => s.tree)?.tree;
  const oldest = tree ? earliest(tree) : undefined;
  const markdown = [
    entryMarkdown(entry, view),
    etymonlineFooter(entry, getPreferenceValues<Preferences>().showEtymonline),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${entry.term} — ${entry.langName}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Language" text={entry.langName} icon={Icon.Globe} />
          {oldest && (
            <Detail.Metadata.Label title="Earliest" text={`${oldest.langName} ${oldest.term}`} icon={Icon.Clock} />
          )}
          <RelationKey tree={tree} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Source" target={entry.pageUrl} text="Wiktionary" />
          <Detail.Metadata.Link
            title="License"
            target="https://creativecommons.org/licenses/by-sa/4.0/"
            text="CC BY-SA 4.0"
          />
        </Detail.Metadata>
      }
      actions={
        <EntryActions
          entry={entry}
          view={view}
          onToggleView={() => setView((v) => (v === "tree" ? "prose" : "tree"))}
          onReload={reload}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          renderAncestor={(node: EtymNode) => <EntryDetail term={node.title} lang={node.lang} />}
        />
      }
    />
  );
}

/** Expands the table's marks, which otherwise need a caption under the table. */
function RelationKey({ tree }: { tree?: EtymNode }) {
  const entries = tree ? relationKey(tree) : [];
  if (entries.length === 0) return null;

  return (
    <Detail.Metadata.TagList title="Key">
      {entries.map((entry) => (
        <Detail.Metadata.TagList.Item key={entry} text={entry} />
      ))}
    </Detail.Metadata.TagList>
  );
}
