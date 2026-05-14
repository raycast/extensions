import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { QuickSettingsForm } from "./components/QuickSettingsForm";
import {
  launchVoicemeeterFromSettings,
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

function byKind(
  targets: VoicemeeterTarget[],
  kind: "strip" | "bus",
): VoicemeeterTarget[] {
  return targets.filter((target) => target.kind === kind);
}

export default function Command() {
  const { state, isLoading, undoCount, refresh } = useVoicemeeterState();
  const { settings, refreshSettings } = useEffectiveSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const { hidden, toggleHidden } = useHidden();

  async function refreshEverything() {
    await Promise.all([refresh(), refreshSettings()]);
  }

  async function handleLaunch() {
    const result = await launchVoicemeeterFromSettings();
    await notifyAction(result);
    await refreshEverything();
  }

  async function handleUndo() {
    const result = await undoLastChange();
    await notifyAction(result);
    await refresh();
  }

  const strips = filterVisible(
    sortWithFavoritesFirst(byKind(state.targets, "strip"), favorites),
    hidden,
  );
  const buses = filterVisible(
    sortWithFavoritesFirst(byKind(state.targets, "bus"), favorites),
    hidden,
  );
  const hiddenTargets = state.targets.filter((t) => isHidden(t, hidden));

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Status"
      searchBarPlaceholder="Filter snapshot..."
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
              text: `${state.targets.length} visible targets`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Snapshot"
                onAction={refreshEverything}
                icon={Icon.Gear}
              />
              <Action
                title="Launch Voicemeeter"
                onAction={handleLaunch}
                icon={Icon.Gear}
              />
              <Action
                title={`Undo Last Change (${undoCount})`}
                onAction={handleUndo}
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

      {byKind(state.targets, "strip").some((s) => s.deviceIn) ? (
        <List.Section title="Physical Inputs">
          {byKind(state.targets, "strip")
            .filter((s) => s.deviceIn)
            .map((strip) => (
              <List.Item
                key={strip.id}
                title={strip.name}
                subtitle={strip.deviceIn}
                accessories={[
                  {
                    icon: {
                      source: Icon.Circle,
                      tintColor: strip.mute ? Color.Red : Color.Green,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={
                        isFavorite(strip, favorites)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      onAction={() => toggleFavorite(strip)}
                      icon={Icon.Star}
                    />
                    <Action
                      title="Hide"
                      onAction={() => toggleHidden(strip)}
                      icon={Icon.EyeDisabled}
                    />
                    <Action
                      title="Refresh Snapshot"
                      onAction={refreshEverything}
                      icon={Icon.Gear}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
      ) : null}

      {settings.sectionOrder === "strips-first" ? (
        <>
          <List.Section title="Strips">
            {strips.map((target) => (
              <List.Item
                key={target.id}
                title={target.name}
                subtitle={`${target.mute ? "Muted" : "Unmuted"} • ${target.gain.toFixed(2)} dB`}
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
                      source: Icon.Circle,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
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
                      title="Refresh Snapshot"
                      onAction={refreshEverything}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
                subtitle={`${target.mute ? "Muted" : "Unmuted"} • ${target.gain.toFixed(2)} dB`}
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
                      source: Icon.Circle,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
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
                      title="Refresh Snapshot"
                      onAction={refreshEverything}
                      icon={Icon.Gear}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
                subtitle={`${target.mute ? "Muted" : "Unmuted"} • ${target.gain.toFixed(2)} dB`}
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
                      source: Icon.Circle,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
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
                      title="Refresh Snapshot"
                      onAction={refreshEverything}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
                subtitle={`${target.mute ? "Muted" : "Unmuted"} • ${target.gain.toFixed(2)} dB`}
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
                      source: Icon.Circle,
                      tintColor: target.mute ? Color.Red : Color.Green,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
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
                      title="Refresh Snapshot"
                      onAction={refreshEverything}
                      icon={Icon.Gear}
                    />
                    <Action
                      title={`Undo Last Change (${undoCount})`}
                      onAction={handleUndo}
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
                    title="Refresh Snapshot"
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
