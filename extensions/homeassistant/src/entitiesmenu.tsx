import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./utils";
import { useHAStates } from "./hooks";
import { MenuBarItemConfigureCommand } from "./components/menu";
import { MediaPlayerAllMenubarItem, MediaPlayerMenubarItem } from "./components/mediaplayer/menu";
import { StateMenubarItem } from "./components/states/menu";

function entitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.entities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

function StatesAllMenubarItem() {
  const launch = async () => {
    return launchCommand({ name: "index", type: LaunchType.UserInitiated });
  };
  return (
    <MenuBarExtra.Item
      title="Open All Entities"
      icon={Icon.Terminal}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={launch}
    />
  );
}

export default function MediaPlayerMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const entityIDs = entitiesPreferences();
  const entities = states
    ?.filter((s) => entityIDs.includes(s.entity_id))
    .sort((a, b) => getFriendlyName(a).localeCompare(getFriendlyName(b)));
  const header = error ? getErrorMessage(error) : undefined;

  return (
    <MenuBarExtra
      icon={{ source: "entity.png", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={"Home Assistant Entities"}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <StatesAllMenubarItem />
      <MenuBarExtra.Section title="Entities">
        {entities?.map((m) => <StateMenubarItem key={m.entity_id} state={m} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
