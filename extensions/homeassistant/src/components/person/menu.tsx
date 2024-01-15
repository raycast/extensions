import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";
import { getFriendlyName } from "@lib/utils";
import { State } from "@lib/haapi";
import { capitalize } from "lodash-es";
import { getIcon } from "@components/state/utils";

export function PersonMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  return (
    <MenuBarSubmenu key={s.entity_id} title={title()} subtitle={capitalize(s.state)} icon={getIcon(s)}>
      <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
