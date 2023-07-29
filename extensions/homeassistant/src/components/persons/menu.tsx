import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";
import { getFriendlyName } from "../../utils";
import { State } from "../../haapi";
import { capitalize } from "lodash-es";
import { getIcon } from "../states/utils";

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
