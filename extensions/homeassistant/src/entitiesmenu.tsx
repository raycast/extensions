import { useHAStates } from "@components/hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "@components/menu";
import { StateMenubarItem } from "@components/state/menu";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { getErrorMessage } from "@lib/utils";
import { Color, Icon, LaunchType, MenuBarExtra } from "@raycast/api";

export default function EntitiesMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const entities = filterViaPreferencePatterns(states, []);
  const header = error ? getErrorMessage(error) : undefined;

  return (
    <MenuBarExtra
      icon={{ source: "entity.png", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={"Home Assistant Entities"}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Entities"
        name="index"
        type={LaunchType.UserInitiated}
        icon={Icon.Terminal}
      />
      <MenuBarExtra.Section title="Entities">
        {entities?.map((m) => <StateMenubarItem key={m.entity_id} state={m} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
