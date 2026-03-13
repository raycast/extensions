import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useFavorites } from "./lib/favorites";
import { cache } from "./lib/ottomatic";
import useOrgPicker from "./components/org-picker";
import { useFrecencySorting } from "@raycast/utils";
import { ottomaticBaseUrl } from "./lib/constants";

export default function Command() {
  const { OrgPicker, selectedOrg } = useOrgPicker();
  const { data, revalidate, isLoading } = useFavorites();
  const favs = data?.filter((fav) => {
    if (selectedOrg === "") return true;
    return fav.org_id === parseInt(selectedOrg);
  });
  const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(favs ?? []);

  function ResetRankingAction({ fav }: { fav: NonNullable<typeof favs>[number] }) {
    return <Action title="Reset Ranking" onAction={() => resetRanking(fav)} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Favorites"
      actions={
        <ActionPanel>
          <Action
            title="Clear Cache"
            onAction={() => {
              cache.clear();
              revalidate();
            }}
          />
        </ActionPanel>
      }
      searchBarAccessory={OrgPicker}
    >
      <List.Section>
        {sortedData?.map((fav) => {
          if (!fav.launchLink) return null;
          if (fav.type === "url")
            return (
              <List.Item
                title={fav.name}
                key={fav.id}
                icon={{
                  source: fav.url.startsWith("fmp") ? "claris.svg" : "server.svg",
                  tintColor: Color.PrimaryText,
                }}
                actions={
                  <ActionPanel>
                    <Action.Open target={fav.launchLink} title="Launch" onOpen={() => visitItem(fav)} />
                    <ResetRankingAction fav={fav} />
                  </ActionPanel>
                }
                subtitle={fav.url}
              />
            );
          else if (fav.type === "server")
            return (
              <List.Item
                title={fav.name}
                key={fav.id}
                icon={{ source: "server.svg" }}
                subtitle={new URL(fav.filemaker_servers.url).hostname}
                actions={
                  <ActionPanel>
                    <Action.Open
                      target={fav.launchLink}
                      title="Launch Server Dashboard"
                      onOpen={() => visitItem(fav)}
                    />
                    <ResetRankingAction fav={fav} />
                  </ActionPanel>
                }
              />
            );
          else if (fav.type === "file")
            return (
              <List.Item
                title={fav.name}
                key={fav.id}
                icon={{
                  source: "claris.svg",
                  tintColor: Color.PrimaryText,
                }}
                subtitle={new URL(fav.filemaker_servers.url).hostname}
                actions={
                  <ActionPanel>
                    <Action.Open target={fav.launchLink} title="Open File" onOpen={() => visitItem(fav)} />
                    <ResetRankingAction fav={fav} />
                  </ActionPanel>
                }
              />
            );
          else if (fav.type === "project")
            return (
              <List.Item
                title={fav.name}
                key={fav.id}
                icon={{
                  source: "briefcase-2.svg",
                  tintColor: Color.PrimaryText,
                }}
                actions={
                  <ActionPanel>
                    <Action.Open target={fav.launchLink} title="Open Project Overview" onOpen={() => visitItem(fav)} />
                    <ResetRankingAction fav={fav} />
                  </ActionPanel>
                }
              />
            );
          return null;
        })}
      </List.Section>
      <List.Section>
        <List.Item
          title="Manage Favorites"
          icon={{ source: "external-link.svg" }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${ottomaticBaseUrl}/favorites`} title="Launch Cloud Console" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
