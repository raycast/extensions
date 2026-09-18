// ActionPanel for EntryDetail. Following an ancestor is the primary action
// because it is the whole interaction: every term in a chain is a door.

import { ReactNode } from "react";
import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { Entry, EtymNode, ancestors } from "../model";
import { etymonlineUrl } from "../sources";
import { applyTemplate, chainOneLine, plainSummary } from "../render";
import { preferences } from "../preferences";
import { Favorite } from "../favorites";
import { COPY_LINK, COPY_MARKDOWN, COPY_PROSE, TOGGLE_VIEW } from "../shortcuts";

interface Props {
  entry: Entry;
  view: "tree" | "prose";
  onToggleView: () => void;
  onReload: () => void;
  isFavorite: boolean;
  onToggleFavorite: (favorite: Favorite) => void;
  /** Supplied by EntryDetail to avoid a circular import back into the view. */
  renderAncestor: (node: EtymNode) => ReactNode;
}

export function EntryActions(props: Props) {
  const { entry, view, onToggleView, onReload, isFavorite, onToggleFavorite, renderAncestor } =
    props;
  const prefs = preferences();

  const first = entry.sections.find((s) => s.tree) ?? entry.sections[0];
  const chain = first?.tree ? chainOneLine(first.tree) : "";

  // One flat list of everything reachable, deduplicated: a compound reaches the
  // same ancestor down two branches often enough to matter.
  const followable = dedupe(
    entry.sections
      .flatMap((s) => (s.tree ? ancestors(s.tree) : []))
      .filter((n) => n.hasPage && n.title),
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {followable.length > 0 && (
          <ActionPanel.Submenu title="Follow Ancestor" icon={Icon.ArrowUp}>
            {followable.map((node) => (
              <Action.Push
                key={`${node.lang}:${node.title}`}
                title={`${node.langName} ${node.term}`}
                icon={Icon.Book}
                target={renderAncestor(node)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action
          title={view === "tree" ? "Show Prose" : "Show Tree"}
          icon={view === "tree" ? Icon.Text : Icon.Tree}
          shortcut={TOGGLE_VIEW}
          onAction={onToggleView}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {chain && (
          <Action.CopyToClipboard
            title="Copy Chain"
            content={chain}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        <Action.CopyToClipboard
          title="Copy as Markdown"
          content={applyTemplate(prefs.markdownTemplate, entry)}
          shortcut={COPY_MARKDOWN}
        />
        <Action.CopyToClipboard
          title="Copy Etymology"
          content={plainSummary(entry)}
          shortcut={COPY_PROSE}
        />
        <Action.CopyToClipboard
          title="Copy Wiktionary Link"
          content={entry.pageUrl}
          shortcut={COPY_LINK}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Open">
        <Action.OpenInBrowser
          title="Open in Wiktionary"
          url={entry.pageUrl}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        {prefs.showEtymonline && (
          <Action.OpenInBrowser
            title="Open in Etymonline"
            url={etymonlineUrl(entry.term)}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={isFavorite ? "Remove from Favorites" : "Pin to Favorites"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() =>
            onToggleFavorite({ term: entry.term, lang: entry.lang, langName: entry.langName })
          }
        />
        <Action
          title="Refresh from Wiktionary"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onReload}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function dedupe(nodes: EtymNode[]): EtymNode[] {
  const seen = new Set<string>();
  return nodes.filter((n) => {
    const key = `${n.lang}:${n.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
