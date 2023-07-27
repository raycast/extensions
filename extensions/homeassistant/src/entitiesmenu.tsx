import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { getErrorMessage } from "./utils";
import { useHAStates } from "./hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import { StateMenubarItem } from "./components/states/menu";
import { State } from "./haapi";

function entitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.entities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}

function sortByPreferenceOrder(entities: State[] | undefined, entityIDs: string[]): State[] | undefined {
  const result: State[] = [];
  if (entities && entities.length > 0) {
    for (const id of entityIDs) {
      const r = entities.find((e) => e.entity_id === id);
      if (r) {
        result.push(r);
      }
    }
  }
  return result;
}

export default function EntitiesMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const entityIDs = entitiesPreferences();
  const entitiesRaws = states?.filter((s) => s && s.entity_id && entityIDs.includes(s.entity_id));
  const entities = sortByPreferenceOrder(entitiesRaws, entityIDs);
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
