import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { EditSavedSites } from "./edit-search-engine";
import { SavedSites, SavedSitesState } from "./saved-sites";
import { strEq } from "./utils";
import { useState } from "react";
import { getFavicon } from "@raycast/utils";
import { showDeletionModal } from "./delete-modal";

export function ManageSavedSites(props: SavedSitesState) {
  const { savedSites: initialSavedSites, setSavedSites: setInitialSavedSites } = props;
  const [savedSites, setMySavedSites] = useState(initialSavedSites);

  function setSavedSites(savedSites: SavedSites) {
    setInitialSavedSites(savedSites);
    setMySavedSites(savedSites);
  }

  const [selectedSiteTitle, setSelectedSiteTitle] = useState("");
  const defaultSiteTitle = savedSites.defaultSiteTitle ?? "";

  return (
    <List
      onSelectionChange={(newTitle) => {
        if (newTitle) {
          setSelectedSiteTitle(newTitle);
        }
      }}
    >
      {savedSites.items.map(({ title, url }, i) => {
        const isDefaultSite = strEq(title, defaultSiteTitle);

        return (
          <List.Item
            title={title}
            subtitle={url}
            id={title}
            key={`${title}~!~${url}`}
            icon={getFavicon(url)}
            accessories={isDefaultSite ? [{ icon: Icon.Star, text: "Default site" }] : undefined}
            actions={
              <ActionPanel>
                <Action.Push
                  target={
                    <EditSavedSites
                      title={title}
                      url={url}
                      savedSites={savedSites}
                      setSavedSites={setSavedSites}
                      isDefault={isDefaultSite}
                      operation={{ type: "edit", index: i }}
                    />
                  }
                  title={selectedSiteTitle === "" ? "Edit" : `Edit "${selectedSiteTitle}"`}
                  icon={Icon.Pencil}
                />
                <Action.Push
                  target={
                    <EditSavedSites savedSites={savedSites} setSavedSites={setSavedSites} operation={{ type: "add" }} />
                  }
                  title="Add New Site"
                  icon={Icon.Plus}
                />
                <Action
                  title={`Delete "${title}"`}
                  onAction={() => showDeletionModal({ savedSites, setSavedSites, title, index: i })}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ key: "x", modifiers: ["ctrl"] }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
