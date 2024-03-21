import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";

import PermissionErrorScreen from "./components/PermissionErrorScreen";
import SelectBrowsers from "./components/SelectBrowsers";
import SelectProfileSubmenu from "./components/SelectProfileSubmenu";
import { BROWSERS_BUNDLE_ID } from "./hooks/useAvailableBrowsers";
import useBookmarks from "./hooks/useBookmarks";

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const { showDomain, openBookmarkBrowser } = getPreferenceValues<Preferences>();

  const {
    bookmarks,
    folders,
    isLoading,
    error,
    mutate,
    availableBrowsers,
    browsers,
    setBrowsers,
    updateFrecency,
    removeFrecency,
    hooks: {
      arc,
      brave,
      braveBeta,
      braveNightly,
      chrome,
      chromeBeta,
      chromeDev,
      edge,
      edgeCanary,
      edgeDev,
      firefox,
      vivaldi,
    },
  } = useBookmarks({ query, selectedFolderId });

  if (error?.message.includes("operation not permitted")) {
    return <PermissionErrorScreen />;
  }

  // Get the browser name from the bundle ID to open the bookmark's in its associated browser
  function browserBundleToName(bundleId: string) {
    return availableBrowsers?.find((browser) => browser.bundleId === bundleId)?.name;
  }

  return (
    <List
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search by title, domain name, or folder name"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Folder" onChange={setSelectedFolderId}>
          <List.Dropdown.Item icon={Icon.Globe} title="All" value="" />

          {folders?.map((folder) => {
            const folderParts = folder.title.split("/");

            return (
              <List.Dropdown.Item
                key={folder.id}
                icon={folder.icon}
                title={folderParts[folderParts.length - 1]}
                value={folder.id}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {bookmarks.map((item) => {
        return (
          <List.Item
            key={item.id}
            icon={getFavicon(item.url)}
            title={item.title}
            subtitle={showDomain ? item.domain : ""}
            accessories={item.folder ? [{ icon: Icon.Folder, tag: item.folder }] : []}
            actions={
              <ActionPanel>
                {openBookmarkBrowser ? (
                  <Action.Open
                    title="Open in Browser"
                    application={openBookmarkBrowser ? browserBundleToName(item.browser) : undefined}
                    target={item.url}
                    onOpen={() => updateFrecency(item)}
                  />
                ) : (
                  <Action.OpenInBrowser url={item.url} onOpen={() => updateFrecency(item)} />
                )}

                <Action.CopyToClipboard title="Copy Link" content={item.url} onCopy={() => updateFrecency(item)} />

                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => removeFrecency(item)} />

                <ActionPanel.Section>
                  {availableBrowsers && availableBrowsers.length > 1 ? (
                    <SelectBrowserAction browsers={browsers} setBrowsers={setBrowsers} />
                  ) : null}

                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.arc}
                    name="Arc"
                    icon="arc.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    profiles={arc.profiles}
                    currentProfile={arc.currentProfile}
                    setCurrentProfile={arc.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.brave}
                    name="Brave"
                    icon="brave.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    profiles={brave.profiles}
                    currentProfile={brave.currentProfile}
                    setCurrentProfile={brave.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.braveBeta}
                    name="Brave Beta"
                    icon="brave.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    profiles={braveBeta.profiles}
                    currentProfile={braveBeta.currentProfile}
                    setCurrentProfile={braveBeta.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.braveNightly}
                    name="Brave Nightly"
                    icon="brave.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    profiles={braveNightly.profiles}
                    currentProfile={braveNightly.currentProfile}
                    setCurrentProfile={braveNightly.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.chrome}
                    name="Chrome"
                    icon="chrome.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    profiles={chrome.profiles}
                    currentProfile={chrome.currentProfile}
                    setCurrentProfile={chrome.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.chromeBeta}
                    name="Chrome Beta"
                    icon="chrome-beta.png"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                    profiles={chromeBeta.profiles}
                    currentProfile={chromeBeta.currentProfile}
                    setCurrentProfile={chromeBeta.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.chromeDev}
                    name="Chrome Dev"
                    icon="chrome-dev.png"
                    shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
                    profiles={chromeDev.profiles}
                    currentProfile={chromeDev.currentProfile}
                    setCurrentProfile={chromeDev.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.edge}
                    name="Edge"
                    icon="edge.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    profiles={edge.profiles}
                    currentProfile={edge.currentProfile}
                    setCurrentProfile={edge.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.edgeCanary}
                    name="Edge Canary"
                    icon="edge.png"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "e" }}
                    profiles={edgeCanary.profiles}
                    currentProfile={edgeCanary.currentProfile}
                    setCurrentProfile={edgeCanary.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.edgeDev}
                    name="Edge Dev"
                    icon="edge.png"
                    shortcut={{ modifiers: ["opt", "shift"], key: "e" }}
                    profiles={edgeDev.profiles}
                    currentProfile={edgeDev.currentProfile}
                    setCurrentProfile={edgeDev.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.firefox}
                    name="Firefox"
                    icon="firefox.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    profiles={firefox.profiles}
                    currentProfile={firefox.currentProfile}
                    setCurrentProfile={firefox.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.firefoxDev}
                    name="Firefox Dev"
                    icon="firefoxDev.png"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
                    profiles={firefox.profiles}
                    currentProfile={firefox.currentProfile}
                    setCurrentProfile={firefox.setCurrentProfile}
                  />
                  <SelectProfileSubmenu
                    bundleId={BROWSERS_BUNDLE_ID.vivaldi}
                    name="Vivaldi"
                    icon="vivaldi.png"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    profiles={vivaldi.profiles}
                    currentProfile={vivaldi.currentProfile}
                    setCurrentProfile={vivaldi.setCurrentProfile}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={mutate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      <List.EmptyView
        title="You don't have any bookmarks"
        description="Press ⏎ to select the browsers you want to import bookmarks from."
        icon="empty-state.png"
        actions={
          <ActionPanel>
            <Action.Push
              title="Select Browsers"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              target={<SelectBrowserAction browsers={browsers} setBrowsers={setBrowsers} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

type SelectBrowsersAction = {
  browsers: string[];
  setBrowsers: (browsers: string[]) => void;
};

function SelectBrowserAction({ browsers, setBrowsers }: SelectBrowsersAction) {
  return (
    <Action.Push
      title="Select Browsers"
      icon={Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      target={<SelectBrowsers browsers={browsers} onSelect={setBrowsers} />}
    />
  );
}
