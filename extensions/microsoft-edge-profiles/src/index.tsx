import { Action, ActionPanel, Icon, Image, LaunchProps, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { EdgeInfoCache, EdgeLocalState, Profile } from "./util/types";
import { openEdge } from "./util/util";

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
          <Action
            title="Open in Microsoft Edge"
            icon={Icon.Globe}
            onAction={async () => {
              await openEdge(profile.directory, "", async () => {
                await showHUD("Opening profile...");
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Command(_props: LaunchProps) {
  const [localState, setLocalState] = useState<EdgeLocalState>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    async function listProfiles() {
      try {
        const path = join(homedir(), "Library/Application Support/Microsoft Edge/Local State");
        const localStateFileBuffer = await readFile(path);
        const localStateFileText = localStateFileBuffer.toString("utf-8");
        setLocalState(JSON.parse(localStateFileText));
      } catch (error) {
        setError(Error("No profile found\nIs Microsoft Edge installed?"));
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
  (infoCache: EdgeInfoCache) =>
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

// (Bookmarks functionality removed as requested)
