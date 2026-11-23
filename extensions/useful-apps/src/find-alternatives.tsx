import { Action, ActionPanel, Application, getApplications, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { App, normalizeName, searchKeywords, SITE_URL, useCatalog } from "./lib/data";
import { AlternativesList, appIcon, dealMap, LoadError, withFeatured } from "./lib/ui";

export default function FindAlternatives() {
  const { data, bySlug, isLoading, error, revalidate } = useCatalog();
  const {
    data: installed,
    isLoading: loadingApps,
    error: appsError,
    revalidate: retryApps,
  } = usePromise(getApplications);
  const deals = dealMap(data?.deal);

  const byName = new Map<string, App>();
  for (const a of data?.apps ?? []) if (a.alt.length) byName.set(normalizeName(a.n), a);

  const onMac: { app: App; local: Application }[] = [];
  const seen = new Set<string>();
  for (const local of installed ?? []) {
    let hit = byName.get(normalizeName(local.name));
    // Short names like "Cap" or "Flow" only count on an exact name match, so unrelated apps don't get matched.
    if (hit && normalizeName(hit.n).length <= 4 && hit.n.toLowerCase() !== local.name.toLowerCase()) hit = undefined;
    if (hit && !seen.has(hit.s)) {
      seen.add(hit.s);
      onMac.push({ app: hit, local });
    }
  }
  onMac.sort((x, y) => x.app.n.localeCompare(y.app.n));
  const others = [...byName.values()].filter((a) => !seen.has(a.s)).sort((x, y) => x.n.localeCompare(y.n));

  const item = (a: App, local?: Application) => (
    <List.Item
      key={a.s}
      icon={local ? { fileIcon: local.path } : appIcon(a)}
      title={a.n}
      subtitle={a.t}
      keywords={searchKeywords(a)}
      accessories={withFeatured(a, [
        { text: `${a.alt.filter((x) => bySlug.has(x.s)).length} alternatives`, icon: Icon.Shuffle },
      ])}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Alternatives"
            icon={Icon.Shuffle}
            target={<AlternativesList app={a} bySlug={bySlug} deals={deals} />}
          />
          <Action.OpenInBrowser title="Open Review" url={a.u} />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading || loadingApps} searchBarPlaceholder="Find alternatives to an app">
      {error && !data ? (
        <LoadError error={error} onRetry={revalidate} />
      ) : appsError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Read the Apps on Your Mac"
          description={appsError.message || "Something went wrong. Try again."}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retryApps} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Shuffle}
          title="No match yet"
          description="Search the full list of apps on The Useful Apps."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open the Useful Apps" url={SITE_URL} />
            </ActionPanel>
          }
        />
      )}
      {appsError ? null : (
        <>
          <List.Section title="On Your Mac" subtitle={`${onMac.length} apps`}>
            {onMac.map(({ app, local }) => item(app, local))}
          </List.Section>
          <List.Section title="More Apps" subtitle={`${others.length} apps`}>
            {others.map((a) => item(a))}
          </List.Section>
        </>
      )}
    </List>
  );
}
