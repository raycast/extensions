import { List, ActionPanel, Action, Icon, LocalStorage, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { AppBaseUrls } from "./utils/Defines";
import { DraftAction, getAllActions } from "./utils/get-all-actions";
import { ActionRunner } from "./utils/ActionRunnerUtils";
import { favoriteActionsPersistKey } from "./find-latest-actions";
import { returnToRootWithMissingContent, showConsentAlert } from "./utils/databaseAccessConfirmation";

export default function Command() {
  const [actions, setActions] = useState<DraftAction[]>([]);
  const [favorites, setFavorites] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActions() {
      const consentGiven = await showConsentAlert();
      if (!consentGiven) {
        returnToRootWithMissingContent();
        return;
      }
      try {
        const savedFavorites = await LocalStorage.getItem<string>(favoriteActionsPersistKey);
        const favoriteMap = savedFavorites ? new Map(JSON.parse(savedFavorites)) : new Map();
        if (savedFavorites) {
          setFavorites(new Map(JSON.parse(savedFavorites)));
        }

        const data = await getAllActions();

        const sortedData = data.sort((a, b) => {
          const isAFavorite = favoriteMap.has(a.uuid);
          const isBFavorite = favoriteMap.has(b.uuid);
          if (isAFavorite && !isBFavorite) return -1;
          if (!isAFavorite && isBFavorite) return 1;
          return 0;
        });

        setActions(sortedData);
      } catch (error) {
        showFailureToast("Failed to load actions");
      } finally {
        setIsLoading(false);
      }
    }

    fetchActions();
  }, []);

  const toggleFavorite = async (uuid: string, withInput: boolean = true) => {
    setFavorites((prevFavorites) => {
      const updatedFavorites = new Map(prevFavorites);
      if (updatedFavorites.has(uuid)) {
        updatedFavorites.delete(uuid);
        showToast({ title: "Removed from Favorites", style: Toast.Style.Success });
      } else {
        updatedFavorites.set(uuid, withInput);
        showToast({
          title: `Added to Favorites (${withInput ? "with" : "without"} input)`,
          style: Toast.Style.Success,
        });
      } // Persist to local storage
      LocalStorage.setItem(favoriteActionsPersistKey, JSON.stringify(Array.from(updatedFavorites)));
      return updatedFavorites;
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Actions..." filtering={true} isShowingDetail={true}>
      {actions?.map((action) => {
        const isFavorite = favorites.has(action.uuid);
        const requiresInput = favorites.get(action.uuid);

        return (
          <List.Item
            key={action.uuid}
            title={action.name}
            accessories={[
              {
                icon: favorites.has(action.uuid) ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled,
              },
            ]}
            detail={<List.Item.Detail markdown={`# ${action.name}\n\n${action.actionDescription}`} />}
            actions={
              <ActionPanel>
                {isFavorite ? (
                  requiresInput != false ? (
                    <Action.Push
                      title="Run Action with Input"
                      icon={Icon.TextInput}
                      target={<ActionRunner action={action} />}
                    />
                  ) : (
                    <Action.OpenInBrowser
                      title="Run Action"
                      url={`${AppBaseUrls.RUN_ACTION}action=${action.name}&text=`}
                      icon={Icon.Play}
                    />
                  )
                ) : (
                  <ActionPanel.Submenu title="Run Action..." icon={Icon.Play}>
                    <Action.Push
                      title="Run Action with Input"
                      icon={Icon.TextInput}
                      target={<ActionRunner action={action} />}
                    />
                    <Action.OpenInBrowser
                      title="Run Action"
                      url={`${AppBaseUrls.RUN_ACTION}action=${action.name}&text=`}
                      icon={Icon.Play}
                    />
                  </ActionPanel.Submenu>
                )}
                {favorites.has(action.uuid) ? (
                  <Action
                    title="Unfavorite"
                    icon={Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => toggleFavorite(action.uuid)}
                  />
                ) : (
                  <ActionPanel.Submenu title="Favorite" icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "f" }}>
                    <Action
                      title="Run with Input"
                      icon={Icon.TextInput}
                      onAction={() => toggleFavorite(action.uuid, true)}
                    />
                    <Action
                      title="Run without Input"
                      icon={Icon.BankNote}
                      onAction={() => toggleFavorite(action.uuid, false)}
                    />
                  </ActionPanel.Submenu>
                )}
                <ActionPanel.Submenu title="Create Quicklink to Run Action..." icon={Icon.Link}>
                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Run ${action.name}`,
                      link: AppBaseUrls.RUN_ACTION + "action=" + encodeURIComponent(action.name) + "&text=",
                    }}
                    icon={Icon.Plus}
                    title={"Create Quicklink Run with no Input"}
                    key={action.uuid + "-noInput"}
                  />
                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Run ${action.name} with Input`,
                      link: AppBaseUrls.RUN_ACTION + "action=" + encodeURIComponent(action.name) + "&text={input}",
                    }}
                    icon={Icon.Plus}
                    title={"Create Quicklink Run with Input"}
                    key={action.uuid + "-withInput"}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
