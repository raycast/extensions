import { ActionPanel, Icon, ImageMask, List, PushAction, showHUD, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import {
  GoogleChromeBookmarkFile,
  GoogleChromeBookmarkFolder,
  GoogleChromeBookmarkURL,
  GoogleChromeInfoCache,
  GoogleChromeLocalState,
  Profile,
} from "./util/types";
import getPrefs from "./util/preferences";
import { createBookmarkListItem, matchSearchText, isValidUrl } from "./util/util";
import { getClipboardText } from "./util/clipboard";

export default function Command() {
  const [localState, setLocalState] = useState<GoogleChromeLocalState>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function listProfiles() {
      try {
        const script = `read POSIX file "${homedir()}/Library/Application Support/Google/Chrome/Local State" as «class utf8»`;
        const localStateFileText = await runAppleScript(script);
        setLocalState(JSON.parse(localStateFileText));
      } catch (error) {
        setError(Error("No profile found\nIs Google Chrome installed?"));
      }
    }

    listProfiles();
  }, []);

  if (error) {
    showToast(ToastStyle.Failure, error.message);
  }

  const infoCache = localState?.profile.info_cache;
  const profiles = infoCache && Object.keys(infoCache).map(extractProfileFromInfoCache(infoCache));

  return (
    <List isLoading={!profiles && !error} searchBarPlaceholder="Search Profile">
      {profiles &&
        profiles.sort(sortAlphabetically).map((profile, index) => (
          <List.Item
            key={index}
            icon={profile.ga?.pictureURL ? { source: profile.ga.pictureURL, mask: ImageMask.Circle } : Icon.Person}
            title={profile.name}
            subtitle={profile.ga?.email}
            keywords={profile.ga?.email ? [profile.ga.email, ...profile.ga.email.split("@")] : undefined}
            actions={
              <ActionPanel>
                <PushAction
                  title="Show Bookmarks"
                  icon={Icon.Link}
                  target={<ListBookmarks profile={profile} />}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                />
                <ActionPanel.Item
                  title="Open in Google Chrome"
                  icon={Icon.Globe}
                  onAction={async () => {
                    await openGoogleChrome(profile.directory, "new-tab", () => showHUD("Opening profile..."));
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

//------------
// Utils
//------------

const extractProfileFromInfoCache =
  (infoCache: GoogleChromeInfoCache) =>
  (infoCacheKey: string): Profile => {
    const profile = infoCache[infoCacheKey];

    return {
      directory: infoCacheKey,
      name: profile.name,
      ...(profile.gaia_name &&
        profile.user_name &&
        profile.last_downloaded_gaia_picture_url_with_size && {
          ga: {
            name: profile.gaia_name,
            email: profile.user_name,
            pictureURL: profile.last_downloaded_gaia_picture_url_with_size,
          },
        }),
    };
  };

const sortAlphabetically = (a: Profile, b: Profile) => a.name.localeCompare(b.name);

const extractBookmarksUrlRecursively = (folder: GoogleChromeBookmarkFolder): GoogleChromeBookmarkURL[] =>
  folder.children.flatMap((e) => {
    switch (e.type) {
      case "url":
        return [e];
      case "folder":
        return extractBookmarksUrlRecursively(e);
    }
  });

const openGoogleChrome = async (profileDirectory: string, link: string, willOpen: () => Promise<void>) => {
  const script = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${profileDirectory}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " ${link}"
  `;

  try {
    await willOpen();
    await runAppleScript(script);
  } catch (error) {
    await showToast(ToastStyle.Failure, "Could not found\nGoogle Chrome.app in Applications folder");
  }
};

//-------------
// Components
//-------------

function ListBookmarks(props: { profile: Profile }) {
  const [bookmarkFile, setBookmarkFile] = useState<GoogleChromeBookmarkFile>();
  const [error, setError] = useState<Error>();
  const [searchText, setSearchText] = useState("");
  const [clipboard, setClipboard] = useState<string>();

  useEffect(() => {
    async function listBookmarks() {
      try {
        const dir = props.profile.directory;
        const script = `read POSIX file "${homedir()}/Library/Application Support/Google/Chrome/${dir}/Bookmarks" as «class utf8»`;
        const bookmarkFileText = await runAppleScript(script);
        setBookmarkFile(JSON.parse(bookmarkFileText));
      } catch (error) {
        setError(Error("No bookmark found"));
      }
    }

    async function copyFromClipboard() {
      try {
        const clipboardText = await getClipboardText();
        setClipboard(clipboardText);
      } catch (error) {
        setClipboard(undefined);
      }
    }

    listBookmarks();
    copyFromClipboard();
  }, []);

  const onSearchTextChange = (text: string) => {
    setSearchText(text);
  };

  const bookmarks = Object.values((bookmarkFile ?? { roots: {} }).roots)
    .flatMap(extractBookmarksUrlRecursively)
    .filter((e) => !e.url.startsWith("chrome://"))
    .map((b) => createBookmarkListItem(b.url, b.name))
    .filter((b) => !searchText || matchSearchText(searchText, b.url, b.title));

  const newTabURL = newTabUrlWithQuery(searchText);

  const tabsOnTop = (
    getPrefs().shouldShowNewTabInBookmarks ? [createBookmarkListItem(newTabURL, "New Tab")] : []
  ).concat(
    clipboard
      ? [
          createBookmarkListItem(
            isValidUrl(clipboard) ? clipboard : newTabUrlWithQuery(clipboard),
            "New Tab from Clipboard"
          ),
        ]
      : []
  );

  if (error && (bookmarks?.length ?? 0) == 0) {
    showToast(ToastStyle.Failure, error.message);
  }

  return (
    <List
      isLoading={!bookmarkFile && !error}
      searchBarPlaceholder="Search Bookmark"
      onSearchTextChange={onSearchTextChange}
    >
      {tabsOnTop.length > 0 && (
        <List.Section title="New Tab">
          {tabsOnTop.map((tab, index) => (
            <List.Item
              key={index}
              title={tab.title}
              subtitle={tab.subtitle}
              icon={{ source: tab.iconURL, fallback: Icon.Globe }}
              actions={<BookmarksActionPanel profileDirectory={props.profile.directory} url={tab.url} />}
            />
          ))}
        </List.Section>
      )}
      {bookmarks && (
        <List.Section title="Bookmarks">
          {bookmarks.map((b, index) => (
            <List.Item
              key={index}
              title={b.title}
              subtitle={b.subtitle}
              icon={{ source: b.iconURL, fallback: Icon.Globe }}
              actions={<BookmarksActionPanel profileDirectory={props.profile.directory} url={b.url} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function newTabUrlWithQuery(searchText: string) {
  return getPrefs().newTabURL.replace("%query%", encodeURIComponent(searchText));
}

function BookmarksActionPanel(props: { profileDirectory: string; url: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Item
        title="Open in Google Chrome"
        icon={Icon.Globe}
        onAction={() => {
          openGoogleChrome(props.profileDirectory, props.url, () => showHUD("Opening bookmark..."));
        }}
      />
      <ActionPanel.Item
        title="Open in Background"
        icon={Icon.Globe}
        onAction={() => {
          openGoogleChrome(props.profileDirectory, props.url, async () => {
            await showToast(ToastStyle.Success, "Opening bookmark...");
          });
        }}
      />
    </ActionPanel>
  );
}
