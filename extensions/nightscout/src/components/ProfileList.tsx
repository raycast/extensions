import { List } from "@raycast/api";
import { AppError, ProfileResponse } from "../types";
import { ActionPanel, Action, Icon } from "@raycast/api";
import { useMemo } from "react";
import { ProfileSwitchForm } from "./TreatmentForm";

interface ProfileListProps {
  profileResults: ProfileResponse[] | null;
  isLoading: boolean;
  appError: AppError | null;
  onRefresh: () => void;
}

export function ProfileList({ profileResults, isLoading, appError, onRefresh }: ProfileListProps) {
  const profiles = useMemo(() => {
    if (!profileResults || profileResults.length === 0) return [];
    return Object.entries(profileResults[0].store).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [profileResults]);

  if (appError) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Error loading profiles">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={appError.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (profiles.length === 0 && !isLoading) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="No profiles available">
        <List.EmptyView
          icon={Icon.Person}
          title="No Profiles"
          description="No profiles found. Check your Nightscout connection."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search profiles...">
      {profiles.map((profile) => (
        <List.Item
          key={profile.name}
          title={profile.name}
          accessories={[{ text: profile.timezone, tooltip: "Timezone" }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={profile.name} icon={Icon.Person} />
                  <List.Item.Detail.Metadata.Label title="Units" text={profile.units} icon={Icon.Ruler} />
                  <List.Item.Detail.Metadata.Label title="Timezone" text={profile.timezone} icon={Icon.Globe} />
                  <List.Item.Detail.Metadata.Label
                    title="Start Date"
                    text={new Date(profile.startDate).toLocaleString()}
                    icon={Icon.Calendar}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Duration of Insulin Action (DIA)"
                    text={`${profile.dia} hours`}
                    icon={Icon.Clock}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Carbs Activity"
                    text={`${profile.carbs_hr} g/hr`}
                    icon={Icon.MugSteam}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Delay"
                    text={`${profile.delay} minutes`}
                    icon={Icon.Hourglass}
                  />
                  <List.Item.Detail.Metadata.Separator />

                  {/* Basal Rates */}
                  <List.Item.Detail.Metadata.Label title="Hourly Basal Rates" text="" icon={Icon.Clock} />
                  {profile.basal.map((entry, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`basal-${index}`}
                      title={`  ${entry.time}`}
                      text={`${entry.value} U/hr`}
                    />
                  ))}

                  <List.Item.Detail.Metadata.Separator />

                  {/* Target Ranges */}
                  <List.Item.Detail.Metadata.Label title="Target Ranges" text="" icon={Icon.Ruler} />
                  {profile.target_low.map((lowEntry, index) => {
                    const highEntry =
                      profile.target_high.find((h) => h.time === lowEntry.time) || profile.target_high[0];
                    return (
                      <List.Item.Detail.Metadata.Label
                        key={`target-${index}`}
                        title={`  ${lowEntry.time}`}
                        text={`${lowEntry.value} - ${highEntry.value} ${profile.units}`}
                      />
                    );
                  })}

                  <List.Item.Detail.Metadata.Separator />

                  {/* Carb Ratios */}
                  <List.Item.Detail.Metadata.Label title="Carb Ratios" text="" icon={Icon.MugSteam} />
                  {profile.carbratio.map((entry, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`carb-${index}`}
                      title={`  ${entry.time}`}
                      text={`1:${entry.value}g`}
                    />
                  ))}

                  {/* Sensitivity */}
                  <List.Item.Detail.Metadata.Label title="Insulin Sensitivity" text="" icon={Icon.Syringe} />
                  {profile.sens.map((entry, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={`sens-${index}`}
                      title={`  ${entry.time}`}
                      text={`${entry.value} ${profile.units}/U`}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Profile in Treatment Form"
                icon={Icon.Pencil}
                target={<ProfileSwitchForm profileName={profile.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
