// The one detail view, shared by all three commands and pushed recursively.
//
// Following an ancestor pushes another EntryDetail for that term in that
// language, which is the whole interaction: the word is a door, not a leaf.
//
// The metadata pane complements the tree rather than restating it. It used to
// list the chain as tags beside a tree that drew the same chain, which spent the
// whole right-hand column saying a second time what the left already said.

import { useEffect, useState } from "react";
import { Detail, Icon, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EtymNode } from "../model";
import { loadEntry, reloadEntry } from "../entry";
import { earliest, entryMarkdown, relationKey } from "../render";
import { preferences } from "../preferences";
import { EntryActions } from "./EntryActions";
import * as favorites from "../favorites";

interface Props {
  term: string;
  lang?: string;
}

export function EntryDetail({ term, lang = "en" }: Props) {
  const [view, setView] = useState(preferences().defaultView);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: entry, isLoading, mutate } = useCachedPromise(loadEntry, [term, lang]);

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

  if (!entry) {
    return <Detail isLoading={isLoading} markdown={`# ${term}`} navigationTitle={term} />;
  }

  const tree = entry.sections.find((s) => s.tree)?.tree;
  const oldest = tree ? earliest(tree) : undefined;
  const markdown = entryMarkdown(entry, view);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${entry.term} — ${entry.langName}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Language" text={entry.langName} icon={Icon.Globe} />
          {oldest && (
            <Detail.Metadata.Label
              title="Earliest"
              text={`${oldest.langName} ${oldest.term}`}
              icon={Icon.Clock}
            />
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
