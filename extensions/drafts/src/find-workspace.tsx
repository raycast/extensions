import { List, ActionPanel, Action, Icon, LocalStorage, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { AppBaseUrls } from "./utils/Defines";
import { getWorkspaces, Workspace } from "./utils/get-workspaces";
import { showConsentAlert, returnToRootWithMissingContent } from "./utils/databaseAccessConfirmation";

const favoritesPersistKey = "open-workspace-favorites";

export default function Command() {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkspaces() {
      const consentGiven = await showConsentAlert();
      if (!consentGiven) {
        returnToRootWithMissingContent();
        return;
      }
      try {
        const savedFavorites = await LocalStorage.getItem<string>(favoritesPersistKey);
        const favoriteSet = savedFavorites ? new Set<string>(JSON.parse(savedFavorites)) : new Set<string>();
        if (savedFavorites) {
          setFavorites(favoriteSet);
        }

        const data = await getWorkspaces();

        const sortedData = data.sort((a, b) => {
          const isAFavorite = favoriteSet.has(a.key);
          const isBFavorite = favoriteSet.has(b.key);
          if (isAFavorite && !isBFavorite) return -1;
          if (!isAFavorite && isBFavorite) return 1;
          return 0;
        });

        setWorkspaces(sortedData);
      } catch (error) {
        showFailureToast("Failed to load Workspaces");
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, []);

  const toggleFavorite = async (key: string) => {
    setFavorites((prevFavorites) => {
      const updatedFavorites = new Set(prevFavorites);
      if (updatedFavorites.has(key)) {
        updatedFavorites.delete(key);
        showToast({ title: "Removed from Favorites", style: Toast.Style.Success });
      } else {
        updatedFavorites.add(key);
        showToast({ title: "Added to Favorites", style: Toast.Style.Success });
      }
      LocalStorage.setItem(favoritesPersistKey, JSON.stringify(Array.from(updatedFavorites)));
      return updatedFavorites;
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Workspaces" filtering={true}>
      {workspaces?.map((workspace) => (
        <List.Item
          key={workspace.key}
          title={workspace.name}
          accessories={[
            {
              icon: favorites.has(workspace.key) ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Workspace"
                url={`${AppBaseUrls.OPEN_WORKSPACE}name=${workspace.name}`}
                icon={Icon.Upload}
              />
              <Action
                title={favorites.has(workspace.key) ? "Unfavorite" : "Favorite"}
                icon={favorites.has(workspace.key) ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => toggleFavorite(workspace.key)}
              />
              <Action.CreateQuicklink
                quicklink={{
                  name: `Open Workspace ${workspace.name}`,
                  link: `${AppBaseUrls.OPEN_WORKSPACE}name=${workspace.name}`,
                }}
                icon={Icon.Plus}
                title={"Create Quicklink to open Workspace " + workspace.name}
                key={workspace.key}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
