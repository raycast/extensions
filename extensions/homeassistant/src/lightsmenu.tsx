import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./utils";
import { useHAStates } from "./hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import { StateMenubarItem } from "./components/states/menu";
import { LightMenubarItem } from "./components/lights/menu";

function hiddenEntitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.hiddenEntities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

export default function LightsMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const hidden = hiddenEntitiesPreferences();
  const entities = states
    ?.filter((s) => s.entity_id.startsWith("light"))
    .filter((s) => !hidden.includes(s.entity_id))
    .sort((a, b) => getFriendlyName(a).localeCompare(getFriendlyName(b)));
  const header = error ? getErrorMessage(error) : undefined;

  const lightOnCount = entities?.filter((e) => e.state === "on").length;
  const rootColor = lightOnCount !== undefined && lightOnCount > 0 ? Color.Yellow : Color.PrimaryText;

  return (
    <MenuBarExtra
      icon={{ source: "lightbulb.png", tintColor: rootColor }}
      isLoading={isLoading}
      tooltip={"Home Assistant Media Players"}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Lights"
        name="lights"
        type={LaunchType.UserInitiated}
        icon={Icon.Terminal}
      />
      <MenuBarExtra.Section title="Media Players">
        {entities?.map((e) => <LightMenubarItem key={e.entity_id} state={e} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
