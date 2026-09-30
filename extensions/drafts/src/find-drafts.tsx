import { List, ActionPanel, Action, Icon, LocalStorage, showToast, Toast, Color } from "@raycast/api";
import { DraftItem, getDrafts } from "./utils/get-drafts"; // adjust this import path
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { AppBaseUrls } from "./utils/Defines";
import { convertSqlDate } from "./utils/DateUtils";
import { getFavoriteActions } from "./utils/get-favorite-actions";
import { DraftAction } from "./utils/get-all-actions";
import { showConsentAlert, returnToRootWithMissingContent } from "./utils/databaseAccessConfirmation";

const favoritesPersistKey = "find-drafts-favorites";

export default function Command() {
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteActions, setFavoriteActions] = useState<DraftAction[]>([]);

  useEffect(() => {
    async function fetchDrafts() {
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

        const data = await getDrafts();

        const sortedData = data.sort((a, b) => {
          const isAFavorite = favoriteSet.has(a.uuid);
          const isBFavorite = favoriteSet.has(b.uuid);
          if (isAFavorite && !isBFavorite) return -1;
          if (!isAFavorite && isBFavorite) return 1;
          return 0;
        });

        const actions = await getFavoriteActions(true);
        setFavoriteActions(actions);
        setDrafts(sortedData);
      } catch (error) {
        showFailureToast("Failed to load Drafts");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDrafts();
  }, []);

  const toggleFavorite = async (uuid: string) => {
    setFavorites((prevFavorites) => {
      const updatedFavorites = new Set(prevFavorites);
      if (updatedFavorites.has(uuid)) {
        updatedFavorites.delete(uuid);
        showToast({ title: "Removed from Favorites", style: Toast.Style.Success });
      } else {
        updatedFavorites.add(uuid);
        showToast({ title: "Added to Favorites", style: Toast.Style.Success });
      }
      LocalStorage.setItem(favoritesPersistKey, JSON.stringify(Array.from(updatedFavorites)));
      return updatedFavorites;
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Drafts..." filtering={true} isShowingDetail={true}>
      {drafts?.map((draft) => (
        <List.Item
          key={draft.uuid}
          title={draft.title}
          detail={<List.Item.Detail markdown={draft.content} />}
          accessories={[
            {
              tag: convertSqlDate(Number(draft.modified)),
              tooltip: "last modified",
            },
            {
              icon: favorites.has(draft.uuid) ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.StarDisabled,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Draft"
                url={`${AppBaseUrls.OPEN_DRAFT}uuid=${draft.uuid}`}
                icon={Icon.Upload}
              />
              <Action
                title={favorites.has(draft.uuid) ? "Unfavorite" : "Favorite"}
                icon={favorites.has(draft.uuid) ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => toggleFavorite(draft.uuid)}
              />
              <Action.CopyToClipboard
                content={draft.content}
                title="Copy Content"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                content={draft.mdTitleLink}
                title="Copy MD Title Link"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard content={draft.uuid} title="Copy UUID" />
              <Action.CreateQuicklink
                quicklink={{ name: `Open Draft ${draft.title}`, link: draft.openUrl }}
                icon={Icon.Plus}
                title={"Create Quicklink to open " + draft.title}
                key={draft.uuid}
              />
              <ActionPanel.Submenu
                title="Run favorited Action on Draft..."
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              >
                {favoriteActions.map((action) => (
                  <Action.OpenInBrowser
                    key={action.uuid}
                    title={action.name}
                    url={`${AppBaseUrls.OPEN_DRAFT}uuid=${draft.uuid}&action=${action.name}`}
                    icon={Icon.Play}
                  />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
