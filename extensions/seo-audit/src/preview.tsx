// How big is this site, and is it the right one.
//
// The command this extension exists for. A full crawl is minutes, which is a
// poor fit for a launcher; a preview settles the host, reads robots.txt and the
// sitemap, and stops — three requests and about a second. That is exactly the
// shape of interaction Raycast is good at, and it is the question somebody
// actually has before spending the minutes.

import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";

// The engine itself. Not a copy of it, not a description of it — the same
// module `bin/seo-audit.mjs` and `worker/index.mjs` import.
import { preview, type Plan } from "../lib/engine";
import { Report as AuditReport } from "./audit";
import { crawlOptions, normalise, previewRows } from "../lib/present.mjs";

const TONE: Record<string, { icon: Icon; tint: Color }> = {
  error: { icon: Icon.XMarkCircle, tint: Color.Red },
  warn: { icon: Icon.ExclamationMark, tint: Color.Orange },
  ok: { icon: Icon.CheckCircle, tint: Color.Green },
  plain: { icon: Icon.Dot, tint: Color.SecondaryText },
};

export default function Command() {
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const site = normalise(text);

  useEffect(() => {
    if (!site) {
      setPlan(null);
      setFailed(null);
      return;
    }
    // Typing "example.com" is nine keystrokes and would be nine previews
    // without this. A preview is cheap; nine of them are not, and they are not
    // this machine's to spend on somebody else's server.
    let cancelled = false;
    const timer = setTimeout(async () => {
      setWorking(true);
      setFailed(null);
      try {
        const found = await preview(site, crawlOptions(getPreferenceValues()));
        if (!cancelled) setPlan(found);
      } catch (error) {
        if (!cancelled) {
          setFailed(error instanceof Error ? error.message : String(error));
          setPlan(null);
        }
      } finally {
        if (!cancelled) setWorking(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [site]);

  const rows = previewRows(plan);

  return (
    <List
      isLoading={working}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="A domain — example.com"
      throttle
    >
      {!site && (
        <List.EmptyView
          icon={Icon.Binoculars}
          title="Type a domain"
          description="Three requests and about a second: how many URLs the sitemap lists, how many would be checked, and where the weight of the site is."
        />
      )}

      {site && failed && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Could not look"
          description={failed}
        />
      )}

      {rows.length > 0 && (
        <List.Section
          title={plan?.origin ?? site ?? ""}
          subtitle={plan?.sitemap ?? undefined}
        >
          {rows.map((row) => (
            <List.Item
              key={row.id}
              icon={
                TONE[row.tone]
                  ? {
                      source: TONE[row.tone].icon,
                      tintColor: TONE[row.tone].tint,
                    }
                  : Icon.Dot
              }
              title={row.title}
              subtitle={row.subtitle}
              actions={
                <ActionPanel>
                  {site && (
                    <Action.Push
                      title="Audit This Site"
                      icon={Icon.MagnifyingGlass}
                      target={<AuditFrom site={site} />}
                    />
                  )}
                  <Action
                    // A preview that says "185 past the limit of 25" and offers
                    // no way to change the limit is a dead end with a number on
                    // it.
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    shortcut={{ modifiers: ["cmd"], key: "," }}
                    onAction={openExtensionPreferences}
                  />
                  <Action.CopyToClipboard
                    title="Copy Line"
                    content={`${row.title} — ${row.subtitle}`}
                  />
                  {plan?.sitemap && (
                    <Action.OpenInBrowser
                      title="Open Sitemap"
                      url={plan.sitemap}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

/// Pushed from a preview, so the site does not have to be typed twice. A plain
/// import rather than `require()` inside the component: this is an ES module,
/// and audit.tsx does not import back, so there is no cycle to work around.
function AuditFrom({ site }: { site: string }) {
  return <AuditReport site={site} />;
}
