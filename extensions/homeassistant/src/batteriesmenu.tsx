import { BatteryMenubarSection } from "@components/battery/menu";
import {
  filterBatteries,
  getBatteryIconSourceForValue,
  getBatteryStateValue,
  sortBatteries,
} from "@components/battery/utils";
import { useHAStates } from "@components/hooks";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "@components/menu";
import { filterViaPreferencePatterns } from "@components/state/utils";
import { getErrorMessage, getFriendlyName } from "@lib/utils";
import { Color, LaunchType, MenuBarExtra, getPreferenceValues } from "@raycast/api";

function excludedBatteriesHigherThenPreference(): number | undefined {
  const prefs = getPreferenceValues();
  const raw = prefs.excludeHigher as string | undefined;
  if (!raw || raw.trim().length <= 0) {
    return;
  }
  const val = parseFloat(raw);
  return Number.isNaN(val) ? undefined : val;
}

export default function BatteriesMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const entitiesFiltered = filterViaPreferencePatterns(states, ["*"])?.sort((a, b) =>
    getFriendlyName(a).localeCompare(getFriendlyName(b)),
  );
  let entities = sortBatteries(filterBatteries(entitiesFiltered));

  const excludedHigher = excludedBatteriesHigherThenPreference();
  if (excludedHigher !== undefined) {
    entities = entities?.filter((b) => getBatteryStateValue(b) <= excludedHigher);
  }
  const header = error ? getErrorMessage(error) : undefined;

  const lowBatteryThreshold = 30;

  const lowBatteries = entities?.filter((e) => getBatteryStateValue(e) < lowBatteryThreshold);
  const restBatteries = entities?.filter((e) => getBatteryStateValue(e) >= lowBatteryThreshold);
  const lowBatteriesCount = lowBatteries && lowBatteries.length > 0 ? lowBatteries.length : 0;

  const batteryLevels = entities?.map((b) => getBatteryStateValue(b));
  const lowestBatteryValue = lowBatteries && lowBatteries.length > 0 ? Math.min(...batteryLevels!) : undefined;
  const iconSrc = getBatteryIconSourceForValue(lowestBatteryValue);

  return (
    <MenuBarExtra
      icon={{ source: iconSrc, tintColor: lowBatteriesCount > 0 ? Color.Red : Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={`Home Assistant Batteries: Low ${lowBatteriesCount}`}
    >
      {header && <MenuBarExtra.Item title={header} />}
      <LaunchCommandMenubarItem
        title="Open All Batteries"
        name="batteries"
        type={LaunchType.UserInitiated}
        icon="battery-00.png"
      />
      <BatteryMenubarSection title={`Low Batteries < ${lowBatteryThreshold}%`} states={lowBatteries} />
      <BatteryMenubarSection
        title="Batteries"
        states={restBatteries}
        emptyElement={<MenuBarExtra.Item title="No Batteries" />}
      />
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
