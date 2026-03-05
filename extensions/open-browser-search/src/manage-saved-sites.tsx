import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";
import { EditSavedSites } from "./edit-search-engine";
import { showDeletionModal } from "./delete-modal";
import { loadSavedSites } from "./saved-sites";
import { SavedSites } from "./types";
import { strEq } from "./utils";

/** Reusable component — pushed from search via Cmd+, */
export function ManageSavedSitesList() {
  const [savedSites, setSavedSites] = useState<SavedSites>(() => loadSavedSites());
  const [selectedSiteTitle, setSelectedSiteTitle] = useState("");
  const defaultSiteTitle = savedSites.defaultSiteTitle ?? "";

  return (
    <List
      onSelectionChange={(newTitle) => {
        if (newTitle) setSelectedSiteTitle(newTitle);
      }}
    >
      {savedSites.items.map(({ title, url, preferredBrowserBundleId }, i) => {
        const isDefaultSite = strEq(title, defaultSiteTitle);

        const accessories: List.Item.Accessory[] = [];
        if (preferredBrowserBundleId) {
          accessories.push({ text: "Custom browser", icon: Icon.AppWindowGrid2x2 });
        }
        if (isDefaultSite) {
          accessories.push({ icon: Icon.Star, text: "Default" });
        }

        return (
          <List.Item
            title={title}
            subtitle={url}
            id={title}
            key={`${title}~${url}`}
            icon={getFavicon(url)}
            accessories={accessories}
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
                      preferredBrowserBundleId={preferredBrowserBundleId}
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
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
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
