import { useHAStates } from "@components/hooks";
import { MediaPlayerMenubarItem } from "@components/mediaplayer/menu";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "@components/menu";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { Color, Icon, LaunchType, MenuBarExtra } from "@raycast/api";

export default function MediaPlayerMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const mediaPlayers = filterViaPreferencePatterns(states, ["media_player.*"])?.sort((a, b) =>
    getFriendlyName(a).localeCompare(getFriendlyName(b)),
  );
  const header = error ? getErrorMessage(error) : undefined;

  return (
    <MenuBarExtra
      icon={{ source: "mediaplayer.png", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={"Home Assistant Media Players"}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Media Players"
        name="mediaplayers"
        type={LaunchType.UserInitiated}
        icon={Icon.Terminal}
      />
      <MenuBarExtra.Section title="Media Players">
        {mediaPlayers?.map((m) => <MediaPlayerMenubarItem key={m.entity_id} state={m} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
