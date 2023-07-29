import { MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getFriendlyName } from "../../utils";
import { getIcon } from "../states";
import { batteryStateValue, sortBatteries } from "./utils";
import { copyToClipboardWithHUD } from "../menu";

export function BatteryMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarExtra.Item
      key={s.entity_id}
      title={getFriendlyName(s)}
      tooltip={s.entity_id}
      subtitle={batteryStateValue(s)}
      icon={getIcon(s)}
      onAction={async () => {
        await copyToClipboardWithHUD(s.entity_id);
      }}
    />
  );
}

export function BatteriesMenubarSection(props: { batteries: State[] | undefined }) {
  const batteries = props.batteries;
  if (!batteries || batteries.length <= 0) {
    return (
      <MenuBarExtra.Section title="Low Batteries">
        <MenuBarExtra.Item title="No Battery Notifications" />
      </MenuBarExtra.Section>
    );
  }
  const sortedStates = sortBatteries(batteries);
  return (
    <MenuBarExtra.Section title="Low Batteries">
      {sortedStates?.map((b) => <BatteryMenubarItem key={b.entity_id} state={b} />)}
    </MenuBarExtra.Section>
  );
}
