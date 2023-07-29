import { MenuBarExtra } from "@raycast/api";
import { State } from "../../lib/haapi";
import { getFriendlyName } from "../../lib/utils";
import { getIcon } from "../state/utils";

export function UpdateMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarExtra.Item
      title={getFriendlyName(s)}
      subtitle="Update Available"
      icon={getIcon(s)}
      onAction={() => {
        /**/
      }}
    />
  );
}

export function UpdatesMenubarSection(props: { updates: State[] | undefined }) {
  const updates = props.updates;
  if (!updates || updates.length <= 0) {
    return (
      <MenuBarExtra.Section title="Updates">
        <MenuBarExtra.Item title="No Updates" />
      </MenuBarExtra.Section>
    );
  }
  return (
    <MenuBarExtra.Section title="Updates">
      {updates?.map((b) => <UpdateMenubarItem key={b.entity_id} state={b} />)}
    </MenuBarExtra.Section>
  );
}
