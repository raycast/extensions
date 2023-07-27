import { State } from "../../haapi";
import { getIcon } from "../states";
import { getFriendlyName } from "../../utils";
import { MediaPlayerMenubarItem } from "../mediaplayer/menu";
import { CoverMenubarItem } from "../cover/menu";
import { PersonMenubarItem } from "../persons/menu";
import { SwitchMenubarItem } from "../switches/menu";
import { CopyToClipboardMenubarItem, MenuBarSubmenu } from "../menu";

export function CopyEntityIDToClipboard(props: { state: State }) {
  const s = props.state;
  return <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />;
}

export function StateMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const e = s.entity_id;
  const domain = e.split(".")[0];
  switch (domain) {
    case "media_player":
      {
        return <MediaPlayerMenubarItem state={s} />;
      }
      break;
    case "cover":
      {
        return <CoverMenubarItem state={s} />;
      }
      break;
    case "person":
      {
        return <PersonMenubarItem state={s} />;
      }
      break;
    case "switch":
      {
        return <SwitchMenubarItem state={s} />;
      }
      break;
  }
  return (
    <MenuBarSubmenu key={s.entity_id} title={getFriendlyName(s)} subtitle={s.state} icon={getIcon(s)}>
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}
