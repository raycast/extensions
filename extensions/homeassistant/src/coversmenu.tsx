import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./utils";
import { useHAStates } from "./hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import { CoverMenubarItem } from "./components/cover/menu";
import { hiddenEntitiesPreferences } from "./components/states/utils";

export default function CoversMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const hidden = hiddenEntitiesPreferences();
  const entities = states
    ?.filter((s) => s.entity_id.startsWith("cover"))
    .filter((s) => !hidden.includes(s.entity_id))
    .sort((a, b) => getFriendlyName(a).localeCompare(getFriendlyName(b)));
  const header = error ? getErrorMessage(error) : undefined;

  const lightOnCount = entities?.filter((e) => e.state === "on").length;
  const rootColor = lightOnCount !== undefined && lightOnCount > 0 ? Color.Yellow : Color.PrimaryText;

  return (
    <MenuBarExtra
      icon={{ source: "cover-close.png", tintColor: rootColor }}
      isLoading={isLoading}
      tooltip={"Home Assistant Media Players"}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Covers"
        name="covers"
        type={LaunchType.UserInitiated}
        icon={Icon.Terminal}
      />
      <MenuBarExtra.Section title="Covers">
        {entities?.map((e) => <CoverMenubarItem key={e.entity_id} state={e} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
