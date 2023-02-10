import { Action, ActionPanel, Clipboard, Icon, Image, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
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

export default function Command() {
  const [localState, setLocalState] = useState<GoogleChromeLocalState>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function listProfiles() {
      try {
        const path = join(homedir(), "Library/Application Support/Google/Chrome/Local State");
        const localStateFileBuffer = await readFile(path);
        const localStateFileText = localStateFileBuffer.toString("utf-8");
        setLocalState(JSON.parse(localStateFileText));
      } catch (error) {
        setError(Error("No profile found\nIs Google Chrome installed?"));
      }
    }

    listProfiles();
  }, []);

  if (error) {
    showToast(Toast.Style.Failure, error.message);
  }

  const infoCache = localState?.profile.info_cache;
  const profiles = infoCache && Object.keys(infoCache).map(extractProfileFromInfoCache(infoCache));

  return (
    <List isLoading={!profiles && !error} searchBarPlaceholder="Search Profile">
      {profiles &&
        profiles.sort(sortAlphabetically).map((profile, index) => (
          <List.Item
            key={index}
            icon={profile.ga?.pictureURL ? { source: profile.ga.pictureURL, mask: Image.Mask.Circle } : Icon.Person}
            title={profile.name}
            subtitle={profile.ga?.email}
            keywords={profile.ga?.email ? [profile.ga.email, ...profile.ga.email.split("@")] : undefined}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Bookmarks"
                  icon={Icon.Link}
                  target={<ListBookmarks profile={profile} />}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                />
                <Action
                  title="Open in Google Chrome"
                  icon={Icon.Globe}
                  onAction={async () => {
                    await openGoogleChrome(profile.directory, "about:blank", () => showHUD("Opening profile..."));
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
    set theLink to quoted form of "${link}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
  `;

  try {
    await willOpen();
    await runAppleScript(script);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Could not found\nGoogle Chrome.app in Applications folder");
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
        const path = join(homedir(), "Library/Application Support/Google/Chrome", dir, "Bookmarks");
        const bookmarkFileBuffer = await readFile(path);
        const bookmarkFileText = bookmarkFileBuffer.toString("utf-8");
        setBookmarkFile(JSON.parse(bookmarkFileText));
      } catch (error) {
        setError(Error("No bookmark found"));
      }
    }

    async function copyFromClipboard() {
      setClipboard(await Clipboard.readText());
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

  const tabsOnTop = [
    searchText
      ? createBookmarkListItem(newTabUrlWithQuery(searchText), "Search")
      : createBookmarkListItem(getPrefs().newBlankTabURL, "Blank"),
  ].concat(
    clipboard
      ? [
          isValidUrl(clipboard)
            ? createBookmarkListItem(clipboard, "Open URL from Clipboard")
            : createBookmarkListItem(newTabUrlWithQuery(clipboard), "Use text from Clipboard"),
        ]
      : []
  );

  if (error && (bookmarks?.length ?? 0) == 0) {
    showToast(Toast.Style.Failure, error.message);
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
      <Action
        title="Open in Google Chrome"
        icon={Icon.Globe}
        onAction={() => {
          openGoogleChrome(props.profileDirectory, props.url, () => showHUD("Opening bookmark..."));
        }}
      />
      <Action
        title="Open in Background"
        icon={Icon.Globe}
        onAction={() => {
          openGoogleChrome(props.profileDirectory, props.url, async () => {
            await showToast(Toast.Style.Success, "Opening bookmark...");
          });
        }}
      />
    </ActionPanel>
  );
}
