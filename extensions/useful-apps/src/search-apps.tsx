import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { SITE_URL, searchKeywords, useCatalog } from "./lib/data";
import { AppActions, AppMetadata, appAccessories, appIcon, appMarkdown, dealMap, LoadError } from "./lib/ui";

export default function SearchApps() {
  const { data, bySlug, isLoading, error, revalidate } = useCatalog();
  const [cat, setCat] = useState("all");
  const [showDetail, setShowDetail] = useState(true);
  const deals = dealMap(data?.deal);
  const apps = (data?.apps ?? []).filter((a) => cat === "all" || a.c === cat).sort((x, y) => y.sc - x.sc);
  const catName = data?.cats.find((c) => c.s === cat)?.n;
  const catNames = new Map((data?.cats ?? []).map((c) => [c.s, c.n]));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && apps.length > 0}
      searchBarPlaceholder="Search hand-picked Mac and iPhone apps"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" storeValue onChange={setCat}>
          <List.Dropdown.Item title="All Categories" value="all" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Section>
            {(data?.cats ?? []).map((c) => (
              <List.Dropdown.Item key={c.s} title={c.n} value={c.s} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && !data ? (
        <LoadError error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No app matches that"
          description="Try a job instead of a name, like clipboard or screen recorder."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open the Useful Apps" url={SITE_URL} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title={catName ?? "All Apps"} subtitle={`${apps.length} apps`}>
        {apps.map((a) => {
          const deal = deals.get(a.s);
          return (
            <List.Item
              key={a.s}
              icon={appIcon(a)}
              title={a.n}
              subtitle={showDetail ? undefined : a.t}
              keywords={searchKeywords(a, catNames.get(a.c))}
              accessories={showDetail ? undefined : appAccessories(a, deal)}
              detail={<List.Item.Detail markdown={appMarkdown(a)} metadata={<AppMetadata a={a} deal={deal} />} />}
              actions={
                <AppActions a={a} bySlug={bySlug} deals={deals} onToggleDetail={() => setShowDetail((v) => !v)} />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
