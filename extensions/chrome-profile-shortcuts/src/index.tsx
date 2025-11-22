import { Action, ActionPanel, Icon, Image, List, showHUD, showToast, Toast, useNavigation, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleChromeLocalState, GoogleChromeInfoCache, Profile } from "./util/types";
import { openGoogleChrome } from "./util/util";
import { getSlotMapping, saveSlotMapping, removeSlotMapping } from "./util/storage";

const SlotSelection = (props: { profile: Profile; profiles: Profile[]; onAssign: () => void }) => {
  const { profile, profiles, onAssign } = props;
  const { pop } = useNavigation();
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadSlots = async () => {
    setIsLoading(true);
    const mapping = await getSlotMapping();
    setSlots(mapping);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const allSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const sortedSlots = allSlots.sort((a, b) => {
    const dirA = slots[`slot_${a}`];
    const dirB = slots[`slot_${b}`];

    const isOwnedA = dirA === profile.directory;
    const isOwnedB = dirB === profile.directory;

    if (isOwnedA && !isOwnedB) return -1;
    if (!isOwnedA && isOwnedB) return 1;

    const isOccupiedA = dirA && !isOwnedA;
    const isOccupiedB = dirB && !isOwnedB;

    if (!isOccupiedA && isOccupiedB) return -1;
    if (isOccupiedA && !isOccupiedB) return 1;

    return a - b;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a slot to assign...">
      {sortedSlots.map((slot) => {
        const assignedDir = slots[`slot_${slot}`];
        const assignedProfile = profiles.find((p) => p.directory === assignedDir);
        const isAssignedToCurrent = assignedDir === profile.directory;
        const isAssignedToOther = assignedDir && !isAssignedToCurrent;

        let icon;
        if (isAssignedToCurrent) {
          icon = { source: Icon.StarCircle, tintColor: Color.Yellow };
        } else if (isAssignedToOther) {
          icon = { source: Icon.StarCircle, tintColor: Color.SecondaryText };
        } else {
          icon = { source: Icon.Circle, tintColor: Color.SecondaryText };
        }

        return (
          <List.Item
            key={slot}
            title={`Slot ${slot}`}
            subtitle={assignedProfile ? `Assigned to: ${assignedProfile.name}` : "Empty"}
            icon={icon}
            accessories={
              isAssignedToCurrent ? [{ icon: Icon.Check, tooltip: "Currently assigned to this profile" }] : []
            }
            actions={
              <ActionPanel>
                {isAssignedToCurrent ? (
                  <Action
                    title={`Clear Slot ${slot}`}
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await removeSlotMapping(slot);
                      await showToast(Toast.Style.Success, `Cleared Slot ${slot}`);
                      await loadSlots(); // Refresh local state
                      onAssign(); // Refresh parent state
                    }}
                  />
                ) : (
                  <Action
                    title={isAssignedToOther ? `Re-assign to Slot ${slot}` : `Assign to Slot ${slot}`}
                    icon={Icon.Check}
                    style={isAssignedToOther ? Action.Style.Destructive : Action.Style.Regular}
                    onAction={async () => {
                      // Check if profile is assigned to ANY other slot and remove it
                      const oldSlotEntry = Object.entries(slots).find(([, dir]) => dir === profile.directory);
                      if (oldSlotEntry) {
                        const oldSlot = parseInt(oldSlotEntry[0].replace("slot_", ""));
                        await removeSlotMapping(oldSlot);
                      }

                      await saveSlotMapping(slot, profile.directory);
                      await showToast(Toast.Style.Success, `Assigned ${profile.name} to Slot ${slot}`);
                      await loadSlots(); // Refresh local state
                      onAssign(); // Refresh parent state
                      pop();
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

const ProfileItem = (props: {
  index: number;
  profile: Profile;
  slots: Record<string, string>;
  profiles: Profile[];
  onAssign: () => void;
}) => {
  const { index, profile, slots, profiles, onAssign } = props;

  // Find which slots this profile is assigned to
  const assignedSlots = Object.entries(slots)
    .filter(([, dir]) => dir === profile.directory)
    .map(([key]) => key.replace("slot_", ""));

  const accessories = assignedSlots.map((slot) => ({
    tag: { value: `Slot ${slot}`, color: "#FFD700" }, // Gold color for slots
    tooltip: `Assigned to Slot ${slot}`,
  }));

  return (
    <List.Item
      key={index}
      icon={profile.ga?.pictureURL ? { source: profile.ga.pictureURL, mask: Image.Mask.Circle } : Icon.Person}
      title={profile.name}
      subtitle={profile.ga?.email}
      accessories={accessories}
      keywords={profile.ga?.email ? [profile.ga.email, ...profile.ga.email.split("@")] : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            title="Select Slot"
            icon={Icon.List}
            target={<SlotSelection profile={profile} profiles={profiles} onAssign={onAssign} />}
          />
          <Action
            title="Open in Google Chrome"
            icon={Icon.Globe}
            onAction={async () => {
              await openGoogleChrome(
                profile.directory,
                "",
                async () => {
                  await showHUD("Opening profile...");
                },
                profile.name,
              );
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
  const [slots, setSlots] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const path = join(homedir(), "Library/Application Support/Google/Chrome/Local State");
      const localStateFileBuffer = await readFile(path);
      const localStateFileText = localStateFileBuffer.toString("utf-8");
      setLocalState(JSON.parse(localStateFileText));

      const mapping = await getSlotMapping();
      setSlots(mapping);
    } catch {
      setError(Error("No profile found\nIs Google Chrome installed?"));
    }
  };

  useEffect(() => {
    loadData();
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
          .map((profile, index) => (
            <ProfileItem
              key={profile.directory}
              index={index}
              profile={profile}
              slots={slots}
              profiles={profiles}
              onAssign={loadData}
            />
          ))}
    </List>
  );
}

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
