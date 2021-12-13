import {
  ActionPanel,
  Icon,
  ImageMask,
  List,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { GoogleChromeInfoCache, GoogleChromeLocalState, Profile } from "./util/types";

export default function Command() {
  const [localState, setLocalState] = useState<GoogleChromeLocalState>();

  useEffect(() => {
    async function listProfiles() {
      const script = `read POSIX file "${homedir()}/Library/Application Support/Google/Chrome/Local State" as «class utf8»`;
      const localStateFileText = await runAppleScript(script);
      setLocalState(JSON.parse(localStateFileText));
    }

    listProfiles();
  }, []);

  const infoCache = localState?.profile.info_cache;
  const profiles = infoCache && Object.keys(infoCache).map(extractProfileFromInfoCache(infoCache));

  return (
    <List isLoading={!profiles} searchBarPlaceholder="Search Profile">
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
                <ActionPanel.Item
                  title="Open in Google Chrome"
                  icon={Icon.Globe}
                  onAction={onActionOpenInGoogleChrome(profile.directory, "new-tab")}
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

const onActionOpenInGoogleChrome = (profileDirectory: string, link: string) => async () => {
  const script = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${profileDirectory}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " ${link}"
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    await showToast(ToastStyle.Failure, (error as Error).message);
  }
};
