import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { QuickSettingsForm } from "./components/QuickSettingsForm";
import {
  launchVoicemeeterFromSettings,
  setStripBusConnection,
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

interface StripConnectionsViewProps {
  stripId: string;
  buses: VoicemeeterTarget[];
  onConnectionChange: (
    strip: VoicemeeterTarget,
    bus: VoicemeeterTarget,
    enabled: boolean,
  ) => Promise<boolean>;
}

function StripConnectionsView({
  stripId,
  buses,
  onConnectionChange,
}: StripConnectionsViewProps) {
  const { pop } = useNavigation();
  const { state, refresh, applyCacheUpdate } = useVoicemeeterState();
  const strip = state.targets.find(
    (t) => t.id === stripId && t.kind === "strip",
  );
  if (!strip) {
    return (
      <List navigationTitle="Connections">
        <List.Item title="Strip not found" icon={Icon.ExclamationMark} />
      </List>
    );
  }
  return (
    <List
      navigationTitle={`${strip.name} – Connections`}
      searchBarPlaceholder="Filter buses..."
    >
      <List.Section title={`Route "${strip.name}" to`}>
        {buses.map((bus) => {
          const connected = strip.routes?.[bus.index] ?? false;
          return (
            <List.Item
              key={bus.id}
              title={bus.name}
              subtitle={connected ? "Connected" : "Not connected"}
              icon={{
                source: connected ? Icon.Link : Icon.XMarkCircle,
                tintColor: connected ? Color.Green : Color.SecondaryText,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title={connected ? "Disconnect" : "Connect"}
                    icon={connected ? Icon.XMarkCircle : Icon.Link}
                    onAction={async () => {
                      const enabled = !connected;
                      const ok = await onConnectionChange(strip, bus, enabled);
                      if (ok) {
                        const nextRoutes = [...(strip.routes ?? [])];
                        while (nextRoutes.length <= bus.index)
                          nextRoutes.push(false);
                        nextRoutes[bus.index] = enabled;
                        await applyCacheUpdate({
                          targetId: strip.id,
                          routes: nextRoutes,
                        });
                      } else {
                        await refresh();
                      }
                    }}
                  />
                  <Action
                    title="Back to Strips"
                    icon={Icon.ArrowLeft}
                    onAction={pop}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const { state, isLoading, refresh, applyCacheUpdate } = useVoicemeeterState();
  const { refreshSettings } = useEffectiveSettings();
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

  async function handleConnection(
    strip: VoicemeeterTarget,
    bus: VoicemeeterTarget,
    enabled: boolean,
  ): Promise<boolean> {
    const result = await setStripBusConnection(
      strip,
      bus,
      enabled,
      state.capabilities,
    );
    await notifyAction(result);
    if (result.ok) {
      const nextRoutes = [...(strip.routes ?? [])];
      while (nextRoutes.length <= bus.index) nextRoutes.push(false);
      nextRoutes[bus.index] = enabled;
      await applyCacheUpdate({ targetId: strip.id, routes: nextRoutes });
    } else {
      await refresh();
    }
    return result.ok;
  }

  const strips = filterVisible(
    sortWithFavoritesFirst(byKind(state.targets, "strip"), favorites),
    hidden,
  );
  const buses = byKind(state.targets, "bus");
  const hiddenTargets = state.targets.filter((t) => isHidden(t, hidden));

  function connectedBusNames(strip: VoicemeeterTarget): string {
    const names = buses
      .filter((bus) => strip.routes?.[bus.index])
      .map((bus) => bus.name);
    if (names.length === 0) {
      return "No buses connected";
    }
    return names.join(", ");
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Connections"
      searchBarPlaceholder="Filter strips..."
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
              text: `${state.capabilities.stripCount} strips • ${state.capabilities.busCount} buses`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refreshEverything} />
              <Action title="Launch Voicemeeter" onAction={handleLaunch} />
              <Action.Push
                title="Quick Settings"
                target={<QuickSettingsForm onSaved={refreshEverything} />}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Strips">
        {strips.map((strip) => (
          <List.Item
            key={strip.id}
            title={strip.name}
            subtitle={connectedBusNames(strip)}
            accessories={[
              ...(isFavorite(strip, favorites)
                ? [
                    {
                      icon: { source: Icon.Star, tintColor: Color.Yellow },
                      tooltip: "Favorite",
                    },
                  ]
                : []),
              { text: "Enter to manage routes" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Manage Routes"
                  icon={Icon.Link}
                  target={
                    <StripConnectionsView
                      stripId={strip.id}
                      buses={buses}
                      onConnectionChange={handleConnection}
                    />
                  }
                />
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
                <Action title="Refresh" onAction={refreshEverything} />
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

      {hiddenTargets.length > 0 ? (
        <List.Section title="Hidden">
          {hiddenTargets.map((target) => (
            <List.Item
              key={target.id}
              title={target.name}
              subtitle={target.kind}
              icon={Icon.EyeDisabled}
              actions={
                <ActionPanel>
                  <Action
                    title="Show"
                    onAction={() => toggleHidden(target)}
                    icon={Icon.Eye}
                  />
                  <Action title="Refresh" onAction={refreshEverything} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
