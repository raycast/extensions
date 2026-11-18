import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { ProfileForm } from "./components/ProfileForm";
import { QuickSettingsForm } from "./components/QuickSettingsForm";
import {
  applyProfile,
  launchVoicemeeterFromSettings,
  undoLastChange,
} from "./lib/controller";
import { notifyAction } from "./lib/feedback";
import { deleteProfile, listProfiles, saveProfile } from "./lib/profiles";
import { MAX_GAIN_DB, MIN_GAIN_DB } from "./lib/target";
import { useEffectiveSettings } from "./lib/use-settings";
import { useVoicemeeterState } from "./lib/use-vm-state";
import { ProfileDefinition } from "./lib/types";

export default function Command() {
  const { state, undoCount, isLoading, refresh, applyCacheUpdate } =
    useVoicemeeterState();
  const { refreshSettings } = useEffectiveSettings();
  const [profiles, setProfiles] = useState<ProfileDefinition[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    setIsProfilesLoading(true);
    const next = await listProfiles();
    setProfiles(next);
    setIsProfilesLoading(false);
  }, []);

  async function refreshEverything() {
    await Promise.all([refresh(), refreshProfiles(), refreshSettings()]);
  }

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  async function handleSaveProfile(profile: ProfileDefinition) {
    await saveProfile(profile);
    await refreshProfiles();
    await showToast({ style: Toast.Style.Success, title: "Profile saved" });
  }

  async function handleDeleteProfile(profile: ProfileDefinition) {
    await deleteProfile(profile.id);
    await refreshProfiles();
    await showToast({ style: Toast.Style.Success, title: "Profile deleted" });
  }

  async function handleApplyProfile(profile: ProfileDefinition) {
    const result = await applyProfile(
      profile,
      state.targets,
      state.capabilities,
    );
    await notifyAction(result);
    if (result.ok) {
      const updates: Array<{
        targetId: string;
        mute?: boolean;
        gain?: number;
        routes?: boolean[];
      }> = [];
      for (const target of state.targets) {
        const override = target.identityKeys
          .map((k) => profile.overrides[k])
          .find(Boolean);
        const mute = override?.mute ?? profile.global.mute;
        const gain = override?.gain ?? profile.global.gain;
        if (typeof mute === "boolean") {
          updates.push({ targetId: target.id, mute });
        }
        if (
          typeof gain === "number" &&
          Number.isFinite(gain) &&
          gain >= MIN_GAIN_DB &&
          gain <= MAX_GAIN_DB
        ) {
          updates.push({
            targetId: target.id,
            gain: Math.round(gain * 100) / 100,
          });
        }
      }
      if (profile.routes) {
        for (const strip of state.targets.filter((t) => t.kind === "strip")) {
          const routes = profile.routes[strip.id];
          if (routes) {
            updates.push({ targetId: strip.id, routes });
          }
        }
      }
      if (updates.length > 0) {
        await applyCacheUpdate(updates);
      }
    } else {
      await refresh();
    }
  }

  async function handleUndo() {
    const result = await undoLastChange();
    await notifyAction(result);
    await refresh();
  }

  async function handleLaunch() {
    const result = await launchVoicemeeterFromSettings();
    await notifyAction(result);
    await refreshEverything();
  }

  return (
    <List
      isLoading={isLoading || isProfilesLoading}
      navigationTitle="Profiles"
      searchBarPlaceholder="Filter profiles..."
    >
      <List.Section title="Connection">
        <List.Item
          title={state.connected ? "Connected" : "Disconnected"}
          subtitle={
            state.connected
              ? `${state.capabilities.edition} detected`
              : (state.error ?? "Voicemeeter unavailable")
          }
          icon={{
            source: state.connected ? Icon.CheckCircle : Icon.CircleDisabled,
            tintColor: state.connected ? Color.Green : Color.Orange,
          }}
          accessories={[
            {
              text: `${state.targets.length} targets`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={refreshEverything}
                icon={Icon.Gear}
              />
              <Action
                title="Launch Voicemeeter"
                onAction={handleLaunch}
                icon={Icon.Gear}
              />
              <Action.Push
                title="Quick Settings"
                target={<QuickSettingsForm onSaved={refreshEverything} />}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Create">
        <List.Item
          title="Create Profile"
          subtitle="Define global values with optional per-target overrides."
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Profile"
                target={
                  <ProfileForm
                    targets={state.targets}
                    onSubmitProfile={handleSaveProfile}
                  />
                }
                icon={Icon.Plus}
              />
              <Action.Push
                title="Quick Settings"
                target={<QuickSettingsForm onSaved={refreshEverything} />}
                icon={Icon.Gear}
              />
              <Action
                title="Refresh"
                onAction={refreshEverything}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Saved Profiles (${profiles.length})`}>
        {profiles.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            subtitle={`Updated ${new Date(profile.updatedAt).toLocaleString("en-US")}`}
            accessories={[
              {
                text: [
                  `${Object.keys(profile.overrides).length} overrides`,
                  profile.routes && Object.keys(profile.routes).length > 0
                    ? "connections"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" • "),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Apply Profile"
                  onAction={() => handleApplyProfile(profile)}
                  icon={Icon.Gear}
                />
                <Action.Push
                  title="Edit Profile"
                  target={
                    <ProfileForm
                      profile={profile}
                      targets={state.targets}
                      onSubmitProfile={handleSaveProfile}
                    />
                  }
                  icon={Icon.Gear}
                />
                <Action
                  title="Delete Profile"
                  onAction={() => handleDeleteProfile(profile)}
                  style={Action.Style.Destructive}
                  icon={Icon.Gear}
                />
                <Action
                  title={`Undo Last Change (${undoCount})`}
                  onAction={handleUndo}
                  icon={Icon.Gear}
                />
                <Action
                  title="Refresh"
                  onAction={refreshEverything}
                  icon={Icon.Gear}
                />
                <Action.Push
                  title="Quick Settings"
                  target={<QuickSettingsForm onSaved={refreshEverything} />}
                  icon={Icon.Gear}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isProfilesLoading && profiles.length === 0 ? (
        <List.EmptyView
          title="No profiles"
          description="Create a profile using Create Profile."
        />
      ) : null}
    </List>
  );
}
