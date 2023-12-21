import {
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { formatDate } from "./helpers/datetime";
import useFollowedStreams from "./helpers/useFollowedStreams";
import { useUserId } from "./helpers/useUserId";
import { userName } from "./helpers/auth";
import { useRef } from "react";

const preferences = getPreferenceValues<Preferences.Live>();

export default function main() {
  const { data: userId, isLoading: isLoadingUserId } = useUserId();
  const { data: items = [], isLoading, updatedAt } = useFollowedStreams(userId, { loadingWhileStale: true });

  const previous = useRef(items);
  if (
    preferences.notify &&
    (previous.current.length !== items.length || previous.current.some((item) => !items.some((i) => i.id === item.id)))
  ) {
    const newItems = items.filter((item) => !previous.current.some((i) => i.id === item.id));
    previous.current = items;

    if (newItems.length === 1) {
      showHUD(`${newItems[0].user_name} is live on Twitch`);
    } else if (newItems.length > 1) {
      showHUD(`${newItems.length} followed channels went live on Twitch`);
    }
  }

  if (!userName) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark}>
        <MenuBarExtra.Item title="Unavailable without a Username" />
        <MenuBarExtra.Item title="Set your Twitch Username" onAction={openCommandPreferences} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      isLoading={isLoadingUserId || isLoading}
      icon={{
        source: items.length
          ? "TwitchGlitchPurple.png"
          : { dark: "TwitchGlitchWhite.png", light: "TwitchGlitchBlackOps.png" },
      }}
      tooltip="Live followed channels"
      title={items.length ? String(items.length) : undefined}
    >
      <MenuBarExtra.Section>
        {items.map((item) => (
          <MenuBarExtra.Item
            key={item.id}
            title={item.user_name}
            subtitle={item.game_name}
            icon={{
              source: { dark: "TwitchGlitchWhite.png", light: "TwitchGlitchBlackOps.png" },
            }}
            onAction={() => {
              open(`https://twitch.tv/${item.user_login}`);
            }}
            alternate={
              <MenuBarExtra.Item
                title={item.user_name}
                icon={{
                  source: Icon.RaycastLogoNeg,
                  tintColor: { light: "#000000", dark: "#FFFFFF", adjustContrast: false },
                }}
                subtitle="Open in Raycast"
                onAction={() => {
                  launchCommand({ name: "following", type: LaunchType.UserInitiated, fallbackText: item.user_name });
                }}
              />
            }
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {items.length === 0 && <MenuBarExtra.Item title={`0 live followed channel`} />}
        <MenuBarExtra.Item title={`Updated ${formatDate(updatedAt, { second: undefined })}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Eye}
          title="Show All Followed Channels"
          onAction={() => {
            launchCommand({ name: "following", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
