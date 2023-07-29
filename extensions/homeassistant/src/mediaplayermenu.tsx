import { Color, Icon, LaunchType, MenuBarExtra } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./lib/utils";
import { useHAStates } from "./hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import { MediaPlayerMenubarItem } from "./components/mediaplayer/menu";
import { filterStates, hiddenEntitiesPreferences } from "./components/state/utils";

export default function MediaPlayerMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const hidden = hiddenEntitiesPreferences();
  const mediaPlayers = filterStates(states, { include: ["media_player.*"], exclude: hidden })?.sort((a, b) =>
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
