import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { getErrorMessage } from "./utils";
import { useHAStates } from "./hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import { StateMenubarItem } from "./components/states/menu";
import { State } from "./haapi";
import { filterStates } from "./components/states/utils";

function entitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.entities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

function filterEntities(states: State[] | undefined): State[] | undefined {
  if (!states) {
    return states;
  }
  const entityFilters = entitiesPreferences();
  let result: State[] = [];
  for (const f of entityFilters) {
    const filtered = filterStates(states, { include: [f] });
    if (filtered && filtered.length > 0) {
      result = result.concat(filtered);
    }
  }
  return result;
}

export default function EntitiesMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const entities = filterEntities(states);
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
