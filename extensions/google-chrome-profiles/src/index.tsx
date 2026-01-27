import {
  Action,
  ActionPanel,
  Clipboard,
  environment,
  getPreferenceValues,
  Icon,
  Image,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  GoogleChromeBookmarkFile,
  GoogleChromeBookmarkFolder,
  GoogleChromeBookmarkURL,
  GoogleChromeInfoCache,
  GoogleChromeLocalState,
  Preferences,
  Profile,
} from "./util/types";
import {
  createBookmarkListItem,
  matchSearchText,
  isValidUrl,
  formatAsUrl,
  openGoogleChrome,
  ChromeAction,
  ChromeTarget,
} from "./util/util";
import { getFavicon } from "@raycast/utils";

const ProfileItem = (props: { index: number; profile: Profile }) => {
  const { index, profile } = props;

  return (
    <List.Item
      key={index}
      icon={profile.ga?.pictureURL ? { source: profile.ga.pictureURL, mask: Image.Mask.Circle } : Icon.Person}
      title={profile.name}
      subtitle={profile.ga?.email}
      keywords={profile.ga?.email ? [profile.ga.email, ...profile.ga.email.split("@")] : undefined}
      actions={
        <ActionPanel>
          <Action.Push title="Show Bookmarks" icon={Icon.Link} target={<ListBookmarks profile={profile} />} />
          <Action
            title="Bring to Front"
            icon={Icon.Window}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              await openGoogleChrome(profile, ChromeAction.Focus, async () => {
                await showHUD("Bringing to front...");
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  const [localState, setLocalState] = useState<GoogleChromeLocalState>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function listProfiles() {
      try {
        // for google-chrome-profiles-1.png:
        // 1. comment the code below:
        const path = join(homedir(), "Library/Application Support/Google/Chrome/Local State");
        const localStateFileBuffer = await readFile(path);
        const localStateFileText = localStateFileBuffer.toString("utf-8");
        setLocalState(JSON.parse(localStateFileText));
        // 2. uncomment function _createDataSetForScreenshot1() at the bottom of the file
        // 3. uncomment code below:
        // setLocalState(_createDataSetForScreenshot1());
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
        profiles
          .sort(sortAlphabetically)
          .map((profile, index) => <ProfileItem key={profile.directory} index={index} profile={profile} />)}
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
    .filter((e): e is Required<GoogleChromeBookmarkURL> => (e.url && isValidUrl(e.url)) == true)
    .map((b) => createBookmarkListItem(b.url, b.name))
    .filter((b) => !searchText || matchSearchText(searchText, b.url, b.title));

  const newTabItems: { target: ChromeTarget; title: string; subtitle?: string; icon: Icon }[] = searchText
    ? (function () {
        // Check for a valid domain pattern: at least 2 characters after the dot (e.g., google.com, google.fr)
        if (isValidUrl(searchText)) {
          return [
            {
              target: ChromeAction.openUrl(searchText),
              title: "Go To",
              subtitle: searchText,
              icon: Icon.Link,
            },
          ];
        } else {
          const looksLikeUrl = /\.[a-z]{2,}/i.test(searchText);

          return [
            ...(looksLikeUrl
              ? (function () {
                  // the user is certainly trying to reach a URL (for example typing "github.com")
                  const searchTextAsURL = formatAsUrl(searchText);
                  return [
                    {
                      target: ChromeAction.openUrl(searchTextAsURL),
                      title: "Go To",
                      subtitle: searchTextAsURL,
                      icon: Icon.Link,
                    },
                  ];
                })()
              : []),
            {
              target: ChromeAction.openUrl(newTabUrlWithQuery(searchText)),
              title: "Search Text in a New Tab",
              subtitle: searchText,
              icon: Icon.MagnifyingGlass,
            },
          ];
        }
      })()
    : [{ target: ChromeAction.NewTab, title: "New Tab", subtitle: undefined, icon: Icon.Plus }];

  const clipboardItem: { target: ChromeTarget; title: string; subtitle?: string; icon: Icon } | null = clipboard
    ? isValidUrl(clipboard)
      ? {
          target: ChromeAction.openUrl(clipboard),
          title: "Go To the URL in the Clipboard",
          subtitle: clipboard,
          icon: Icon.Link,
        }
      : {
          target: ChromeAction.openUrl(newTabUrlWithQuery(clipboard)),
          title: "Search Text in the Clipboard",
          subtitle: clipboard,
          icon: Icon.Clipboard,
        }
    : null;

  if (error && (bookmarks?.length ?? 0) == 0) {
    showToast(Toast.Style.Failure, error.message);
  }

  return (
    <List
      isLoading={!bookmarkFile && !error}
      searchBarPlaceholder={`Search Bookmark in ${props.profile.name}`}
      onSearchTextChange={onSearchTextChange}
    >
      {!searchText && (
        <List.Section>
          <List.Item
            title="Bring to Front"
            icon={Icon.Window}
            actions={<ActionPanelForTarget profile={props.profile} target={ChromeAction.Focus} />}
          />
          {newTabItems.map((tab, index) => (
            <List.Item
              key={`newtab-${index}`}
              title={tab.title}
              subtitle={tab.subtitle}
              icon={tab.icon}
              actions={<ActionPanelForTarget profile={props.profile} target={tab.target} />}
            />
          ))}
          {clipboardItem && (
            <List.Item
              title={clipboardItem.title}
              subtitle={clipboardItem.subtitle}
              icon={clipboardItem.icon}
              actions={<ActionPanelForTarget profile={props.profile} target={clipboardItem.target} />}
            />
          )}
        </List.Section>
      )}
      {searchText && (
        <List.Section>
          {newTabItems.map((tab, index) => (
            <List.Item
              key={`newtab-${index}`}
              title={tab.title}
              subtitle={tab.subtitle}
              icon={tab.icon}
              actions={<ActionPanelForTarget profile={props.profile} target={tab.target} />}
            />
          ))}
        </List.Section>
      )}
      {bookmarks && bookmarks.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarks.map((b, index) => (
            <List.Item
              key={index}
              title={b.title}
              subtitle={b.subtitle}
              icon={getFavicon(b.iconURL, { fallback: Icon.Globe, mask: Image.Mask.Circle })}
              actions={<ActionPanelForTarget profile={props.profile} target={ChromeAction.openUrl(b.url)} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function newTabUrlWithQuery(searchText: string) {
  return getPreferenceValues<Preferences>().newTabURL.replace("%query%", encodeURIComponent(searchText));
}

function ActionPanelForTarget(props: { profile: Profile; target: ChromeTarget }) {
  const context = encodeURIComponent(
    JSON.stringify({ directory: props.profile.directory, name: props.profile.name, ...props.target }),
  );
  const deeplink = `raycast://extensions/frouo/${environment.extensionName}/open-profile?context=${context}`;

  const action = props.target.action;
  const hudMessage =
    action === "focus" ? "Bringing to front..." : action === "newTab" ? "Opening new tab..." : "Opening...";

  const quicklinkTitle =
    action === "focus"
      ? "Create Quicklink (Bring to Front)"
      : action === "newTab"
      ? "Create Quicklink (New Tab)"
      : "Create Quicklink (Open the URL)";

  const quicklinkName =
    action === "focus"
      ? `${props.profile.name} > Bring to Front`
      : action === "newTab"
      ? `${props.profile.name} > New Tab`
      : `${props.profile.name} > Open ${props.target.url}`;

  return (
    <ActionPanel>
      <Action
        title="Open in Google Chrome"
        icon={Icon.Globe}
        onAction={() => {
          openGoogleChrome(props.profile, props.target, async () => {
            await showHUD(hudMessage);
          });
        }}
      />
      <Action.CreateQuicklink title={quicklinkTitle} quicklink={{ name: quicklinkName, link: deeplink }} />
    </ActionPanel>
  );
}

// function _createDataSetForScreenshot1() {
//   const pictureURL =
//     "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
//   return [
//     {
//       key: "Default",
//       name: "Personal",
//       email: "sarah@gmail.com",
//       pictureURL,
//     },
//     {
//       name: "Client - Acme Corp",
//       email: "sarah.mitchell@acmecorp.com",
//       pictureURL,
//     },
//     {
//       name: "Freelance",
//       email: "hello@sarahmitchell.design",
//       pictureURL,
//     },
//     {
//       name: "Side Project",
//       email: "sarah.m.dev@outlook.com",
//       pictureURL: "https://dummyimage.com/200x200/bf3030/ffffff&text=S",
//     },
//     {
//       name: "Client - TechStart",
//       email: "sarah@techstart.io",
//       pictureURL,
//     },
//     {
//       name: "Shopping",
//     },
//   ].reduce<GoogleChromeLocalState>(
//     (prev, curr, idx) => {
//       // ts-ignore
//       prev.profile.info_cache[curr.key ?? `Profile ${idx}`] = {
//         avatar_icon: "",
//         name: curr.name,
//         gaia_name: "xxx",
//         last_downloaded_gaia_picture_url_with_size: curr.pictureURL,
//         user_name: curr.email,
//       };
//       return prev;
//     },
//     {
//       profile: {
//         info_cache: {},
//       },
//     },
//   );
// }
