import { Color, Icon, LaunchType, MenuBarExtra } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./utils";
import { useHAStates } from "./hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import { LightMenubarItem } from "./components/light/menu";
import { filterStates, hiddenEntitiesPreferences } from "./components/states/utils";

export default function LightsMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const hidden = hiddenEntitiesPreferences();
  const entities = filterStates(states, { include: ["light.*"], exclude: hidden })?.sort((a, b) =>
    getFriendlyName(a).localeCompare(getFriendlyName(b)),
  );
  const header = error ? getErrorMessage(error) : undefined;

  const lightOnCount = entities?.filter((e) => e.state === "on").length;
  const lightOffCount = entities?.filter((e) => e.state === "off").length;
  const rootColor = lightOnCount !== undefined && lightOnCount > 0 ? Color.Yellow : Color.PrimaryText;

  return (
    <MenuBarExtra
      icon={{ source: "lightbulb.png", tintColor: rootColor }}
      isLoading={isLoading}
      tooltip={`Home Assistant Lights: On ${lightOnCount}, Off ${lightOffCount}`}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Lights"
        name="lights"
        type={LaunchType.UserInitiated}
        icon={Icon.Terminal}
      />
      <MenuBarExtra.Section title="Lights">
        {entities?.map((e) => <LightMenubarItem key={e.entity_id} state={e} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
