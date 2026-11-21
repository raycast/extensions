import { Color, Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useState } from "react";
import { toggleConnection } from "./lib/connection";
import { displayName, formatUptime } from "./lib/format";
import { Profile } from "./lib/types";
import { useProfiles } from "./lib/use-profiles";

export default function Command() {
  const { data: profiles = [], isLoading, error, revalidate } = useProfiles();
  // Raycast unloads a menu bar command once it stops loading, so stay "loading" until a
  // connect or disconnect has finished.
  const [busy, setBusy] = useState(false);

  const connected = profiles.filter((p) => p.connected);

  async function toggle(profile: Profile) {
    setBusy(true);
    try {
      await toggleConnection(profile);
    } finally {
      setBusy(false);
      revalidate();
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading || busy}
      icon={{
        source: connected.length > 0 ? "menu-bar-connected.png" : "menu-bar-disconnected.png",
        // Tinted like a template image, so it follows the menu bar's light or dark appearance.
        tintColor: Color.PrimaryText,
      }}
      tooltip={connected.length > 0 ? `Connected: ${connected.map(displayName).join(", ")}` : "Pritunl: not connected"}
    >
      {error ? (
        <MenuBarExtra.Item title="Couldn't load profiles" subtitle={error.message} />
      ) : (
        <MenuBarExtra.Section title="Profiles">
          {profiles.map((profile) => (
            <MenuBarExtra.Item
              key={profile.id}
              icon={
                profile.connected
                  ? { source: Icon.CircleFilled, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={displayName(profile)}
              subtitle={profile.connected ? formatUptime(profile.uptime) : undefined}
              tooltip={
                profile.connected ? `Disconnect from ${displayName(profile)}` : `Connect to ${displayName(profile)}`
              }
              onAction={() => toggle(profile)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage VPN Connections"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "manage-connections", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
