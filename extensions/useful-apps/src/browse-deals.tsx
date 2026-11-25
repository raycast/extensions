import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { Deal, today, useCatalog } from "./lib/data";
import {
  AlternativesList,
  AppMetadata,
  appIcon,
  appMarkdown,
  dealLine,
  dealMap,
  LoadError,
  withFeatured,
} from "./lib/ui";

export default function BrowseDeals() {
  const { data, bySlug, isLoading, error, revalidate } = useCatalog();
  const [showDetail, setShowDetail] = useState(true);
  const deals = dealMap(data?.deal);
  const now = today();
  const live = (data?.deal ?? []).filter((d) => bySlug.has(d.s) && (!d.to || d.to >= now));
  const started = live.filter((d) => !d.from || d.from <= now);
  const soon = live.filter((d) => d.from && d.from > now);
  const byBest = (x: Deal, y: Deal) => Number(y.top) - Number(x.top) || (y.off ?? 0) - (x.off ?? 0);

  const item = (d: Deal) => {
    const a = bySlug.get(d.s)!;
    return (
      <List.Item
        key={d.s}
        icon={appIcon(a)}
        title={a.n}
        subtitle={showDetail ? undefined : dealLine(d)}
        keywords={[a.t, d.l]}
        accessories={withFeatured(a, [{ tag: { value: d.off ? `${d.off}% off` : "Deal", color: Color.Green } }])}
        detail={
          <List.Item.Detail
            markdown={appMarkdown(a, `**The deal:** ${dealLine(d)}.`)}
            metadata={<AppMetadata a={a} deal={d} />}
          />
        }
        actions={
          <ActionPanel>
            {d.u ? <Action.OpenInBrowser title="Get the Deal" url={d.u} icon={Icon.Tag} /> : null}
            {d.code ? (
              <Action.CopyToClipboard
                title="Copy Discount Code"
                content={d.code}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            <Action
              title="Toggle Details"
              icon={Icon.Sidebar}
              onAction={() => setShowDetail((v) => !v)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.OpenInBrowser title="Open Review" url={a.u} />
            {a.alt.length ? (
              <Action.Push
                title="Show Alternatives"
                icon={Icon.Shuffle}
                target={<AlternativesList app={a} bySlug={bySlug} deals={deals} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail && live.length > 0} searchBarPlaceholder="Search app deals">
      {error && !data ? (
        <LoadError error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Tag}
          title="No confirmed deals right now"
          description="We only list deals the developer confirmed. New ones show up here as soon as they're checked."
          actions={
            data ? (
              <ActionPanel>
                <Action.OpenInBrowser title="Open the Deals Page" url={data.deals} />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      <List.Section title="On Sale Now" subtitle={`${started.length} deals`}>
        {started.sort(byBest).map(item)}
      </List.Section>
      <List.Section title="Starting Soon" subtitle={`${soon.length} deals`}>
        {soon.sort((x, y) => (x.from ?? "").localeCompare(y.from ?? "") || byBest(x, y)).map(item)}
      </List.Section>
    </List>
  );
}
