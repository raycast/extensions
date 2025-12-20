import { Action, ActionPanel, Icon, Image, List, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleChromeInfoCache, GoogleChromeLocalState, Profile } from "./util/types";
import { getAllWindowIds, openGoogleChrome, switchChromeWindow } from "./util/util";
import { ListHistories } from "./components/history-item";
import SearchTab from "./components/search-tab";

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const ProfileItem = (props: { index: number; profile: Profile }) => {
  const { index, profile } = props;

  const handleProfileClick = async () => {
    const windowIds = await getAllWindowIds();
    if (windowIds.length) {
      const existingWindowId = Number(await LocalStorage.getItem<string>(profile.directory));
      if (existingWindowId && windowIds.includes(existingWindowId)) {
        await switchChromeWindow(existingWindowId, async () => {
          await showHUD("Switching profile...");
        });
        return;
      }
    }
    const windowID = await openGoogleChrome(profile.directory, "", async () => {
      await showHUD("Opening profile...");
    });
    if (windowID) await LocalStorage.setItem(profile.directory, windowID);
  };

  return (
    <List.Item
      key={index}
      icon={profile.ga?.pictureURL ? { source: profile.ga.pictureURL, mask: Image.Mask.Circle } : Icon.Person}
      title={profile.name}
      subtitle={profile.ga?.email}
      keywords={profile.ga?.email ? [profile.ga.email, ...profile.ga.email.split("@")] : undefined}
      actions={
        <ActionPanel>
          <Action title="Open in Google Chrome" icon={Icon.Globe} onAction={handleProfileClick} />
          <Action.Push
            title="Show Histories"
            icon={Icon.Link}
            target={<ListHistories profileDirectory={profile.directory} />}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.Push title="Search Tabs" target={<SearchTab />} shortcut={{ modifiers: ["shift"], key: "tab" }} />
        </ActionPanel>
      }
    />
  );
};

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
