import { useEffect, useState } from "react";
import { List, closeMainWindow, popToRoot } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

import { STORAGE_KEY } from "./constants";
import { SearchResultList } from "./SearchResultList";
import { findProfileByHint } from "./profileUtils";
import { openSearch } from "./search";
import type { BrowserProfile, CommandProps } from "./types";

export default function Command(props: CommandProps) {
  const { value: profiles = [], setValue: setProfiles, isLoading } = useLocalStorage<BrowserProfile[]>(STORAGE_KEY, []);
  const profileHint = props.arguments.profile?.trim() ?? "";
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    async function tryLaunch() {
      const query = props.arguments.query?.trim();
      if (!query || !profileHint || isLoading || launched) {
        return;
      }

      const match = findProfileByHint(profiles, profileHint);
      if (match) {
        setLaunched(true);
        try {
          await openSearch(query, match);
          await popToRoot({ clearSearchBar: true });
          await closeMainWindow();
        } catch {
          setLaunched(false);
        }
      }
    }

    tryLaunch();
  }, [isLoading, profiles, profileHint, props.arguments.query, launched]);

  // If a profile hint is provided, avoid showing the dropdown while profiles are
  // still loading or when a matching profile exists — this prevents a brief flash
  // of the selection UI when the deeplink already specifies the profile.
  if (profileHint) {
    if (isLoading) {
      return (
        <List>
          <List.EmptyView title="Opening…" description="Loading profile" />
        </List>
      );
    }

    const match = findProfileByHint(profiles, profileHint);
    if (match || launched) {
      return (
        <List>
          <List.EmptyView title="Opening…" description={`Opening with ${match?.name ?? profileHint}`} />
        </List>
      );
    }
  }

  return (
    <SearchResultList
      query={props.arguments.query.trim()}
      profileHint={profileHint}
      profiles={profiles}
      setProfiles={setProfiles}
      isLoading={isLoading}
    />
  );
}
