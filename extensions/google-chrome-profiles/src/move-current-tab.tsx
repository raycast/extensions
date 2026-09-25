import { Action, ActionPanel, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { moveCurrentTab, readCurrentTab, SourceTab } from "./util/chrome";
import { extractProfiles, filterProfiles, readChromeLocalState } from "./util/profiles";
import { getSelectedBrowser, Profile } from "./util/types";
import { isValidUrl } from "./util/util";

export default function Command() {
  const browser = getSelectedBrowser();
  const [source, setSource] = useState<SourceTab>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const moving = useRef(false);
  const initialized = useRef(false);

  async function move(tab: SourceTab, destination: Profile, allProfiles: Profile[]) {
    if (moving.current) return;
    moving.current = true;
    setLoading(true);
    try {
      await moveCurrentTab(tab, destination, browser, allProfiles);
      await showHUD(`Moved tab to ${destination.name}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Could not move tab",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      moving.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function load() {
      try {
        const profiles = extractProfiles((await readChromeLocalState(browser)).state.profile.info_cache);
        if (profiles.length < 2) throw new Error("Create another Chrome profile first");
        const tab = await readCurrentTab(browser, profiles);
        if (!isValidUrl(tab.url)) throw new Error("This tab's URL cannot be moved to another profile");
        setProfiles(profiles);
        setSource(tab);
        const destinations = profiles.filter((profile) => profile.directory !== tab.profile.directory);
        if (destinations.length === 1) await move(tab, destinations[0], profiles);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
        await showToast(Toast.Style.Failure, "Could not read current tab", message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const destinations = profiles.filter((profile) => profile.directory !== source?.profile.directory);
  return (
    <List
      isLoading={loading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Move Tab to Profile"
    >
      {error ? (
        <List.EmptyView title="Cannot Move Current Tab" description={error} icon={Icon.ExclamationMark} />
      ) : (
        source &&
        filterProfiles(destinations, search).map((profile) => (
          <List.Item
            key={profile.directory}
            title={profile.name}
            subtitle={profile.ga?.email}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action title="Move Tab Here" icon={Icon.ArrowRight} onAction={() => move(source, profile, profiles)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
