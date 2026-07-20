import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { QuickSettingsForm } from "./components/QuickSettingsForm";
import {
  launchVoicemeeterFromSettings,
  setTargetMute,
  toggleTargetMute,
  undoLastChange,
} from "./lib/controller";
import { notifyAction } from "./lib/feedback";
import { isFavorite, sortWithFavoritesFirst } from "./lib/favorites";
import { filterVisible, isHidden } from "./lib/hidden";
import { useEffectiveSettings } from "./lib/use-settings";
import { useFavorites } from "./lib/use-favorites";
import { useHidden } from "./lib/use-hidden";
import { useVoicemeeterState } from "./lib/use-vm-state";
import { VoicemeeterTarget } from "./lib/types";

function sectionTargets(
  targets: VoicemeeterTarget[],
  kind: "strip" | "bus",
): VoicemeeterTarget[] {
  return targets.filter((target) => target.kind === kind);
}

export default function Command() {
  const { state, isLoading, undoCount, refresh, applyCacheUpdate } =
    useVoicemeeterState();
  const { settings, refreshSettings } = useEffectiveSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const { hidden, toggleHidden } = useHidden();

  async function refreshEverything() {
    await Promise.all([refresh(), refreshSettings()]);
  }

  async function handleToggle(target: VoicemeeterTarget) {
    const result = await toggleTargetMute(target);
    await notifyAction(result);
    if (result.ok && result.newMute !== undefined) {
      await applyCacheUpdate({ targetId: target.id, mute: result.newMute });
    } else {
      await refresh();
    }
  }

  async function handleExplicit(target: VoicemeeterTarget, mute: boolean) {
    const result = await setTargetMute(target, mute);
    await notifyAction(result);
    if (result.ok) {
      await applyCacheUpdate({ targetId: target.id, mute });
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

  const strips = filterVisible(
    sortWithFavoritesFirst(sectionTargets(state.targets, "strip"), favorites),
    hidden,
  );
  const buses = filterVisible(
    sortWithFavoritesFirst(sectionTargets(state.targets, "bus"), favorites),
    hidden,
  );
  const hiddenTargets = state.targets.filter((t) => isHidden(t, hidden));

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Mute"
      searchBarPlaceholder="Filter strips and buses..."
      isShowingDetail={false}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            onAction={refreshEverything}
            icon={Icon.Gear}
          />
          <Action
            title={`Undo Last Change (${undoCount})`}
            onAction={handleUndo}
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
            shortcut={{ modifiers: ["cmd"], key: ";" }}
          />
        </ActionPanel>
      }
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
              text: `${state.capabilities.stripCount + state.capabilities.busCount} targets`,
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

      {settings.sectionOrder === "strips-first" ? (
        <>
          <List.Section title="Strips">
            {strips.map((target) => (
              <List.Item
                key={target.id}
                title={target.name}
                subtitle={`Gain ${target.gain.toFixed(2)} dB`}
                accessories={[
                  ...(isFavorite(target, favorites)
                    ? [
                        {
                          icon: { source: Icon.Star, tintColor: Color.Yellow },
                          tooltip: "Favorite",
                        },
                      ]
                    : []),
                  {
                    icon: {
                      source: target.mute ? Icon.SpeakerOff : Icon.SpeakerOn,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                    tooltip: target.mute ? "Muted" : "Unmuted",
                  },
                ]}
                actions={
                  <ActionPanel>
                    {settings.muteBehavior !== "explicit-idempotent" ? (
                      <Action
                        title="Toggle Mute"
                        onAction={() => handleToggle(target)}
                        icon={Icon.Gear}
                      />
                    ) : null}
                    <Action
                      title="Mute"
                      onAction={() => handleExplicit(target, true)}
                      icon={Icon.Gear}
                    />
                    <Action
                      title="Unmute"
                      onAction={() => handleExplicit(target, false)}
                      icon={Icon.Gear}
                    />
                    <Action
                      title={
                        isFavorite(target, favorites)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      onAction={() => toggleFavorite(target)}
                      icon={Icon.Star}
                    />
                    <Action
                      title="Hide"
                      onAction={() => toggleHidden(target)}
                      icon={Icon.EyeDisabled}
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
          <List.Section title="Buses">
            {buses.map((target) => (
              <List.Item
                key={target.id}
                title={target.name}
                subtitle={`Gain ${target.gain.toFixed(2)} dB`}
                accessories={[
                  ...(isFavorite(target, favorites)
                    ? [
                        {
                          icon: { source: Icon.Star, tintColor: Color.Yellow },
                          tooltip: "Favorite",
                        },
                      ]
                    : []),
                  {
                    icon: {
                      source: target.mute ? Icon.SpeakerOff : Icon.SpeakerOn,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                    tooltip: target.mute ? "Muted" : "Unmuted",
                  },
                ]}
                actions={
                  <ActionPanel>
                    {settings.muteBehavior !== "explicit-idempotent" ? (
                      <Action
                        title="Toggle Mute"
                        onAction={() => handleToggle(target)}
                        icon={Icon.Gear}
                      />
                    ) : null}
                    <Action
                      title="Mute"
                      onAction={() => handleExplicit(target, true)}
                      icon={Icon.Gear}
                    />
                    <Action
                      title="Unmute"
                      onAction={() => handleExplicit(target, false)}
                      icon={Icon.Gear}
                    />
                    <Action
                      title={
                        isFavorite(target, favorites)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      onAction={() => toggleFavorite(target)}
                      icon={Icon.Star}
                    />
                    <Action
                      title="Hide"
                      onAction={() => toggleHidden(target)}
                      icon={Icon.EyeDisabled}
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
        </>
      ) : (
        <>
          <List.Section title="Buses">
            {buses.map((target) => (
              <List.Item
                key={target.id}
                title={target.name}
                subtitle={`Gain ${target.gain.toFixed(2)} dB`}
                accessories={[
                  ...(isFavorite(target, favorites)
                    ? [
                        {
                          icon: { source: Icon.Star, tintColor: Color.Yellow },
                          tooltip: "Favorite",
                        },
                      ]
                    : []),
                  {
                    icon: {
                      source: target.mute ? Icon.SpeakerOff : Icon.SpeakerOn,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                    tooltip: target.mute ? "Muted" : "Unmuted",
                  },
                ]}
                actions={
                  <ActionPanel>
                    {settings.muteBehavior !== "explicit-idempotent" ? (
                      <Action
                        title="Toggle Mute"
                        onAction={() => handleToggle(target)}
                      />
                    ) : null}
                    <Action
                      title="Mute"
                      onAction={() => handleExplicit(target, true)}
                    />
                    <Action
                      title="Unmute"
                      onAction={() => handleExplicit(target, false)}
                    />
                    <Action
                      title={
                        isFavorite(target, favorites)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      onAction={() => toggleFavorite(target)}
                      icon={Icon.Star}
                    />
                    <Action
                      title="Hide"
                      onAction={() => toggleHidden(target)}
                      icon={Icon.EyeDisabled}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
          <List.Section title="Strips">
            {strips.map((target) => (
              <List.Item
                key={target.id}
                title={target.name}
                subtitle={`Gain ${target.gain.toFixed(2)} dB`}
                accessories={[
                  ...(isFavorite(target, favorites)
                    ? [
                        {
                          icon: { source: Icon.Star, tintColor: Color.Yellow },
                          tooltip: "Favorite",
                        },
                      ]
                    : []),
                  {
                    icon: {
                      source: target.mute ? Icon.SpeakerOff : Icon.SpeakerOn,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                    tooltip: target.mute ? "Muted" : "Unmuted",
                  },
                ]}
                actions={
                  <ActionPanel>
                    {settings.muteBehavior !== "explicit-idempotent" ? (
                      <Action
                        title="Toggle Mute"
                        onAction={() => handleToggle(target)}
                      />
                    ) : null}
                    <Action
                      title="Mute"
                      onAction={() => handleExplicit(target, true)}
                    />
                    <Action
                      title="Unmute"
                      onAction={() => handleExplicit(target, false)}
                    />
                    <Action
                      title={
                        isFavorite(target, favorites)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      onAction={() => toggleFavorite(target)}
                      icon={Icon.Star}
                    />
                    <Action
                      title="Hide"
                      onAction={() => toggleHidden(target)}
                      icon={Icon.EyeDisabled}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
        </>
      )}

      {!isLoading &&
      strips.length + buses.length + hiddenTargets.length === 0 ? (
        <List.EmptyView
          title="No targets"
          description="Voicemeeter not connected or no visible targets."
        />
      ) : null}

      {hiddenTargets.length > 0 ? (
        <List.Section title="Hidden">
          {hiddenTargets.map((target) => (
            <List.Item
              key={target.id}
              title={target.name}
              subtitle={`${target.kind} • Gain ${target.gain.toFixed(2)} dB`}
              icon={Icon.EyeDisabled}
              actions={
                <ActionPanel>
                  <Action
                    title="Show"
                    onAction={() => toggleHidden(target)}
                    icon={Icon.Eye}
                  />
                  <Action
                    title="Refresh"
                    onAction={refreshEverything}
                    icon={Icon.Gear}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
