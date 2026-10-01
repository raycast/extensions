import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { runControl } from "./run-control";
import { readStoredItems } from "./read-stored-items";

type Profile = { id: string; name: string };

async function readProfiles(): Promise<Profile[]> {
  return readStoredItems<Profile>(
    "settingsProfiles",
    (profile): profile is Profile =>
      typeof profile === "object" &&
      profile !== null &&
      "id" in profile &&
      typeof profile.id === "string" &&
      "name" in profile &&
      typeof profile.name === "string" &&
      profile.name.length > 0,
  );
}

export default function Command() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    setIsLoading(true);
    try {
      setProfiles(await readProfiles());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load Tethered profiles",
        message: detail,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Tethered profiles">
      {profiles.length === 0 && !isLoading ? <List.EmptyView title="No saved profiles found" /> : null}
      {profiles.map((profile) => (
        <List.Item
          key={profile.id}
          title={profile.name}
          actions={
            <ActionPanel>
              <Action
                title="Apply Profile"
                onAction={() =>
                  runControl(`/profile/apply?name=${encodeURIComponent(profile.name)}`, `Apply ${profile.name}`)
                }
              />
              <Action title="Refresh Profiles" onAction={reload} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
