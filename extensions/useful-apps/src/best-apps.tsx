import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { App, Deal, Guide, useCatalog } from "./lib/data";
import { AppActions, AppMetadata, appIcon, appMarkdown, dealMap, LoadError, withFeatured } from "./lib/ui";

export default function BestApps() {
  const { data, bySlug, isLoading, error, revalidate } = useCatalog();
  const deals = dealMap(data?.deal);
  const guides = (data?.guides ?? []).filter((g) => g.picks.some((s) => bySlug.has(s)));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="What do you need an app for?">
      {error && !data ? <LoadError error={error} onRetry={revalidate} /> : null}
      {guides.map((g) => {
        const winner = g.w ? bySlug.get(g.w) : undefined;
        return (
          <List.Item
            key={g.s}
            icon={winner ? appIcon(winner) : Icon.Trophy}
            title={g.n.replace(/^The best /, "Best ")}
            keywords={[g.s, ...g.picks.map((s) => bySlug.get(s)?.n ?? "")]}
            accessories={[{ text: winner ? `Winner: ${winner.n}` : `${g.picks.length} picks` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Picks"
                  icon={Icon.Trophy}
                  target={<GuidePicks guide={g} bySlug={bySlug} deals={deals} />}
                />
                <Action.OpenInBrowser title="Open Guide" url={g.u} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function GuidePicks({ guide, bySlug, deals }: { guide: Guide; bySlug: Map<string, App>; deals: Map<string, Deal> }) {
  const picks = guide.picks.map((s) => bySlug.get(s)).filter((a): a is App => !!a);
  return (
    <List navigationTitle={guide.n} isShowingDetail searchBarPlaceholder="Filter picks">
      <List.Section title={guide.a || guide.n}>
        {picks.map((a, i) => {
          const deal = deals.get(a.s);
          return (
            <List.Item
              key={a.s}
              icon={appIcon(a)}
              title={`${i + 1}. ${a.n}`}
              keywords={[a.t]}
              accessories={withFeatured(a, a.s === guide.w ? [{ icon: Icon.Trophy, tooltip: "Our top pick" }] : [])}
              detail={<List.Item.Detail markdown={appMarkdown(a)} metadata={<AppMetadata a={a} deal={deal} />} />}
              actions={<AppActions a={a} bySlug={bySlug} deals={deals} />}
            />
          );
        })}
      </List.Section>
      <List.Section>
        <List.Item
          icon={Icon.Globe}
          title="Read the Full Guide"
          detail={
            <List.Item.Detail
              markdown={`## ${guide.n}\n\n${guide.a}\n\nPress Enter to read why each app ranks where it does.`}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Guide" url={guide.u} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
