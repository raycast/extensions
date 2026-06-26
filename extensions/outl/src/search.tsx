/**
 * Search — search-as-you-type over blocks and pages.
 *
 * Runs `outl --workspace <ws> search <query> --in all --json` on every
 * keystroke (debounced by Raycast's `useState` + the controlled list).
 * Enter opens the hit in the desktop app via its `outl://` deep link;
 * a secondary action copies the link.
 */

import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { runOutl } from "./lib/cli";
import { linkForSlug, isJournalSlug } from "./lib/deeplink";
import { showErrorToast } from "./lib/errors";

/** A block hit from `search --in all`. */
interface BlockHit {
  id: string;
  handle: string;
  text: string;
  page: string;
  path: string;
}

/** A page hit from `search --in all`. */
interface PageHit {
  slug: string;
  title: string;
  icon: string | null;
  is_journal: boolean;
  path: string;
}

/** The `data` payload of `outl search`. */
interface SearchData {
  blocks?: BlockHit[];
  pages?: PageHit[];
}

export default function Search(): React.JSX.Element {
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<SearchData>({ blocks: [], pages: [] });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      setData({ blocks: [], pages: [] });
      return;
    }

    let cancelled = false;
    setLoading(true);
    runOutl<SearchData>(["search", trimmed, "--in", "all"])
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData({ blocks: [], pages: [] });
          void showErrorToast(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const pages = data.pages ?? [];
  const blocks = data.blocks ?? [];

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search blocks and pages..."
      throttle
    >
      <List.Section title="Pages" subtitle={`${pages.length}`}>
        {pages.map((p) => {
          const link = linkForSlug(p.slug, p.is_journal);
          return (
            <List.Item
              key={`page-${p.slug}`}
              icon={p.icon ?? (p.is_journal ? Icon.Calendar : Icon.Document)}
              title={p.title || p.slug}
              subtitle={p.slug}
              accessories={[{ text: p.is_journal ? "journal" : "page" }]}
              actions={<HitActions link={link} title={p.title || p.slug} />}
            />
          );
        })}
      </List.Section>

      <List.Section title="Blocks" subtitle={`${blocks.length}`}>
        {blocks.map((b) => {
          const link = linkForSlug(b.page, isJournalSlug(b.page));
          return (
            <List.Item
              key={`block-${b.id}`}
              icon={Icon.Text}
              title={b.text}
              subtitle={b.page}
              actions={<HitActions link={link} title={b.text} />}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** Primary "open in app" + secondary "copy link" actions for a hit. */
function HitActions(props: { link: string; title: string }): React.JSX.Element {
  return (
    <ActionPanel>
      <Action
        title="Open in Outl"
        icon={Icon.AppWindow}
        onAction={async () => {
          try {
            await open(props.link);
          } catch (err) {
            await showErrorToast(err);
          }
        }}
      />
      <Action
        title="Copy Deep Link"
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={async () => {
          await Clipboard.copy(props.link);
          await showToast({ style: Toast.Style.Success, title: "Link copied" });
        }}
      />
    </ActionPanel>
  );
}
