import { getIcon } from "@components/state/utils";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { capitalize } from "lodash-es";
import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "../menu";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";

function PersonOpenMapsMenuBarItem({ state: s }: { state: State }) {
  if (!s.entity_id.startsWith("person.")) {
    return null;
  }
  const lat = s.attributes.latitude as number | undefined;
  const long = s.attributes.longitude as number | undefined;
  if (lat === undefined || long === undefined) {
    return null;
  }
  return <RUIMenuBarExtra.OpenMaps coordinates={{ lat, long }} />;
}

export function PersonMenubarItem(props: { state: State }) {
  const s = props.state;
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  return (
    <MenuBarSubmenu key={s.entity_id} title={title()} subtitle={capitalize(s.state)} icon={getIcon(s)}>
      <PersonOpenMapsMenuBarItem state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <RUIMenuBarExtra.CopyToClipboard title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
