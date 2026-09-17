import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { Profiles } from "./lib/profiles";
import { TogglePair } from "./lib/toggle-pair";
import { profileSubtitle } from "./utils/profile-subtitle.util";

export default function ConfigureToggle() {
  const { data: profiles, isLoading: profilesLoading } = usePromise(Profiles.getAll);
  const { data: pair, isLoading: pairLoading, revalidate } = usePromise(TogglePair.load);
  const [firstPick, setFirstPick] = useState<string | null>(null);

  const isLoading = profilesLoading || pairLoading;

  if (firstPick) {
    return (
      <List searchBarPlaceholder="Select second profile…">
        {profiles
          ?.filter((p) => p.id !== firstPick)
          .map((profile) => (
            <List.Item
              key={profile.id}
              title={profile.name}
              subtitle={profileSubtitle(profile)}
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    icon={Icon.Checkmark}
                    onAction={async () => {
                      await TogglePair.save({
                        profileIdA: firstPick,
                        profileIdB: profile.id,
                        lastAppliedId: firstPick,
                      });
                      await showToast({ style: Toast.Style.Success, title: "Toggle pair saved" });
                      setFirstPick(null);
                      revalidate();
                    }}
                  />
                  <Action title="Back" icon={Icon.ArrowLeft} onAction={() => setFirstPick(null)} />
                </ActionPanel>
              }
            />
          ))}
      </List>
    );
  }

  const profileA = pair ? profiles?.find((p) => p.id === pair.profileIdA) : undefined;
  const profileB = pair ? profiles?.find((p) => p.id === pair.profileIdB) : undefined;
  const hasPair = profileA && profileB;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select first profile…">
      {hasPair && (
        <List.Section title="Current Toggle Pair">
          <List.Item title={profileA.name} subtitle={profileSubtitle(profileA)} accessories={[{ tag: "First" }]} />
          <List.Item title={profileB.name} subtitle={profileSubtitle(profileB)} accessories={[{ tag: "Second" }]} />
        </List.Section>
      )}
      <List.Section title={hasPair ? "Reconfigure" : "Select First Profile"}>
        {profiles?.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            subtitle={profileSubtitle(profile)}
            actions={
              <ActionPanel>
                <Action title="Select" icon={Icon.Checkmark} onAction={() => setFirstPick(profile.id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!profiles?.length && (
        <List.EmptyView title="No Profiles" description="Create profiles first using the Create Profile command" />
      )}
    </List>
  );
}
