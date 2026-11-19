import { Action, ActionPanel, Color, Icon, Keyboard, Image, List } from "@raycast/api";
import { App, Deal, isLive, shortDate, today } from "./data";

export function appIcon(a: App): Image.ImageLike {
  return { source: a.i, mask: Image.Mask.RoundedRectangle, fallback: Icon.AppWindow };
}

export function dealLine(d: Deal) {
  const parts = [d.l];
  if (d.code) parts.push(`code ${d.code}`);
  if (d.from && d.from > today()) parts.push(`starts ${shortDate(d.from)}`);
  if (d.to) parts.push(`ends ${shortDate(d.to)}`);
  return parts.join(", ");
}

export function appMarkdown(a: App, extra?: string) {
  const lines = [`## ${a.n}`, `${a.t}`, "", `${a.v}`, "", `**Get it if:** ${a.f}`, "", `**Skip it if:** ${a.k}`];
  if (extra) lines.push("", extra);
  return lines.join("\n");
}

export function AppMetadata({ a, deal }: { a: App; deal?: Deal }) {
  return (
    <List.Item.Detail.Metadata>
      {a.fe ? (
        <List.Item.Detail.Metadata.TagList title="Listing">
          <List.Item.Detail.Metadata.TagList.Item text="Featured (paid)" />
        </List.Item.Detail.Metadata.TagList>
      ) : null}
      <List.Item.Detail.Metadata.Label title="Price" text={a.pl || a.p} />
      {deal ? <List.Item.Detail.Metadata.Label title="Deal" text={dealLine(deal)} icon={Icon.Tag} /> : null}
      <List.Item.Detail.Metadata.TagList title="Works On">
        {a.d.map((d) => (
          <List.Item.Detail.Metadata.TagList.Item key={d} text={d} />
        ))}
      </List.Item.Detail.Metadata.TagList>
      {a.r ? (
        <List.Item.Detail.Metadata.Label
          title="Rating"
          text={`${a.r[0].toFixed(1)} from ${a.r[1].toLocaleString("en-US")} ratings`}
          icon={Icon.Star}
        />
      ) : null}
      {a.alt.length ? <List.Item.Detail.Metadata.Label title="Alternatives" text={`${a.alt.length} picked`} /> : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link title="Full Review" target={a.u} text="The Useful Apps" />
    </List.Item.Detail.Metadata>
  );
}

export function AppActions({
  a,
  bySlug,
  deals,
  onToggleDetail,
}: {
  a: App;
  bySlug: Map<string, App>;
  deals: Map<string, Deal>;
  onToggleDetail?: () => void;
}) {
  return (
    <ActionPanel title={a.n}>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Review" url={a.u} />
        {a.get ? <Action.OpenInBrowser title={getTitle(a.get.l)} url={a.get.u} icon={Icon.Download} /> : null}
        {a.alt.length ? (
          <Action.Push
            title="Show Alternatives"
            icon={Icon.Shuffle}
            target={<AlternativesList app={a} bySlug={bySlug} deals={deals} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        ) : null}
        {onToggleDetail ? (
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            onAction={onToggleDetail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        ) : null}
      </ActionPanel.Section>
      {a.vs.length ? (
        <ActionPanel.Section title="Compare">
          {a.vs
            .filter((v) => bySlug.has(v.o))
            .map((v) => (
              <Action.OpenInBrowser
                key={v.o}
                title={`Compare with ${bySlug.get(v.o)!.n}`}
                icon={Icon.Switch}
                url={v.u}
              />
            ))}
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Review Link"
          content={a.u.replace(/\?utm_source=raycast$/, "")}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {a.web ? <Action.OpenInBrowser title="Open Developer Website" url={a.web} icon={Icon.Globe} /> : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getTitle(label: string) {
  if (label === "Setapp") return "Get It on Setapp";
  if (/App Store/.test(label)) return `Open in ${label}`;
  if (label === "From the developer") return "Get It from the Developer";
  return `Get It: ${label}`;
}

export function appAccessories(a: App, deal?: Deal): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [];
  if (deal)
    acc.push({ tag: { value: deal.off ? `${deal.off}% off` : "Deal", color: Color.Green }, tooltip: dealLine(deal) });
  const fe = featuredAccessory(a);
  if (fe) acc.push(fe);
  acc.push({ text: a.p });
  return acc;
}

const FEATURED_TOOLTIP = "A paid Featured listing on The Useful Apps. It never changes the ranking.";

/** The paid-listing label, shown wherever an app is listed. */
export function featuredAccessory(a: App): List.Item.Accessory | undefined {
  return a.fe ? { tag: "Featured", tooltip: FEATURED_TOOLTIP } : undefined;
}

/** Puts the Featured label in front of a list item's own accessories. */
export function withFeatured(a: App, acc: List.Item.Accessory[]): List.Item.Accessory[] {
  const fe = featuredAccessory(a);
  return fe ? [fe, ...acc] : acc;
}

/** The picks we list instead of an app, each with the line on why you'd pick it. */
export function AlternativesList({
  app,
  bySlug,
  deals,
}: {
  app: App;
  bySlug: Map<string, App>;
  deals: Map<string, Deal>;
}) {
  const picks = app.alt.filter((x) => bySlug.has(x.s));
  return (
    <List
      navigationTitle={`Alternatives to ${app.n}`}
      isShowingDetail
      searchBarPlaceholder={`Filter alternatives to ${app.n}`}
    >
      <List.Section title={`Instead of ${app.n}`} subtitle={`${picks.length} picks`}>
        {picks.map((x) => {
          const a = bySlug.get(x.s)!;
          const deal = deals.get(a.s);
          return (
            <List.Item
              key={a.s}
              icon={appIcon(a)}
              title={a.n}
              keywords={[a.t]}
              accessories={withFeatured(
                a,
                deal ? [{ tag: { value: deal.off ? `${deal.off}% off` : "Deal", color: Color.Green } }] : [],
              )}
              detail={
                <List.Item.Detail
                  markdown={appMarkdown(a, `**Why pick it over ${app.n}:** ${x.w}`)}
                  metadata={<AppMetadata a={a} deal={deal} />}
                />
              }
              actions={<AppActions a={a} bySlug={bySlug} deals={deals} />}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** Deals that are on right now, by app. Deals that start later only show in Browse App Deals. */
export function dealMap(list: Deal[] | undefined) {
  const now = today();
  return new Map<string, Deal>((list ?? []).filter((d) => isLive(d, now)).map((d) => [d.s, d]));
}

/** Shown instead of an empty list when the feed couldn't load. */
export function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Couldn't Load The Useful Apps"
      description={error.message || "Something went wrong. Try again."}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
