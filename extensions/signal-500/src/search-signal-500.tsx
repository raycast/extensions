import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

/**
 * Search the Signal 500 — feeds.bar's hand-scored catalogue of 500 news and
 * expert sources — from Raycast.
 *
 * Data comes from the same public endpoint the feeds.bar site bakes from.
 * Slug derivation and page eligibility mirror the site's own rules
 * (FeedsBarWebsite src/lib/sourceSelection.mjs) so "Open Signal 500 Page"
 * only appears when that page actually exists.
 */

const API = "https://feedsbar-edge-api.netlify.app/.netlify/functions/v1_signal500";

type Source = {
  id: string;
  name: string;
  domain: string;
  pillar: string;
  feed_url: string;
  one_liner: string | null;
  rank_score: number;
  signal_100: boolean;
  measured: boolean;
  thumb_url: string | null;
  icon_url: string | null;
};

type Payload = { sources: Source[]; pillars?: string[] };

// Mirrors the site's sourceSlug(): single-label registrable domains drop the
// TLD; deeper domains keep every label; a generic first label keeps the TLD.
const GENERIC = new Set(["blog", "news", "daily", "feeds", "www", "magazine", "journal"]);
function sourceSlug(domain: string): string {
  const d = String(domain || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  if (!d) return "";
  const parts = d.split(".");
  const base = parts.length === 2 && !GENERIC.has(parts[0]) ? parts[0] : d;
  return base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const hasPage = (s: Source) => Boolean(s.measured && s.thumb_url);

export default function Command() {
  const [pillar, setPillar] = useState<string>("all");
  const { isLoading, data } = useCachedPromise(
    async () => {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`Signal 500 API answered ${res.status}`);
      const json = (await res.json()) as Payload;
      return json.sources.sort((a, b) => b.rank_score - a.rank_score);
    },
    [],
    { keepPreviousData: true },
  );

  const pillars = [...new Set((data ?? []).map((s) => s.pillar))].sort();
  const shown = (data ?? []).filter((s) => pillar === "all" || s.pillar === pillar);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search 500 hand-scored sources…"
      searchBarAccessory={
        <List.Dropdown tooltip="Pillar" storeValue onChange={setPillar}>
          <List.Dropdown.Item title="All pillars" value="all" />
          {pillars.map((p) => (
            <List.Dropdown.Item key={p} title={p} value={p} />
          ))}
        </List.Dropdown>
      }
    >
      {shown.map((s) => (
        <List.Item
          key={s.id}
          title={s.name}
          subtitle={s.one_liner ?? s.domain}
          icon={s.icon_url ?? Icon.Globe}
          keywords={[s.domain, s.pillar, ...s.name.split(/\s+/)]}
          accessories={[
            { tag: s.pillar },
            { text: String(s.rank_score), tooltip: "Signal score" },
            ...(s.signal_100 ? [{ icon: Icon.Star, tooltip: "Signal 100" }] : []),
          ]}
          actions={
            <ActionPanel>
              {hasPage(s) && (
                <Action.OpenInBrowser
                  title="Open Signal 500 Page"
                  url={`https://feeds.bar/signal-500/${sourceSlug(s.domain)}/`}
                />
              )}
              <Action.OpenInBrowser title="Open Website" url={`https://${s.domain}`} />
              <Action.CopyToClipboard
                title="Copy Feed URL"
                content={s.feed_url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Website URL"
                content={`https://${s.domain}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Browse the Full Signal 500"
                url="https://feeds.bar/signal-500/"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
