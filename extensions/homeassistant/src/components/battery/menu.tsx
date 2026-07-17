import { CopyEntityIDToClipboard, CopyEntityStateToClipboardMenubarItem } from "@components/state/menu";
import { getIcon } from "@components/state/utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { MenuBarExtra } from "@raycast/api";
import { MenuBarSubmenu } from "../menu";
import { batteryStateValue } from "./utils";

export function BatteryMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu key={s.entity_id} title={getFriendlyName(s)} subtitle={batteryStateValue(s)} icon={getIcon(s)}>
      <CopyEntityIDToClipboard state={s} />
      <CopyEntityStateToClipboardMenubarItem state={s} />
    </MenuBarSubmenu>
  );
}

export function BatteryMenubarSection(props: {
  states: State[] | undefined;
  title?: string;
  emptyElement?: React.ReactNode;
}) {
  const states = props.states;
  if (!states || states.length <= 0) {
    if (props.emptyElement) {
      return (
        <MenuBarExtra.Section title={props.title}>
          <>{props.emptyElement}</>
        </MenuBarExtra.Section>
      );
    }
    return null;
  }
  return (
    <MenuBarExtra.Section title={props.title}>
      {states?.map((b) => (
        <BatteryMenubarItem key={b.entity_id} state={b} />
      ))}
    </MenuBarExtra.Section>
  );
}
