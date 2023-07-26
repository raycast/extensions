import { MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getIcon } from "../states";
import { getFriendlyName } from "../../utils";
import { MediaPlayerMenubarItem } from "../mediaplayer/menu";
import { CoverMenubarItem } from "../cover/menu";
import { PersonMenubarItem } from "../persons/menu";
import { SwitchMenubarItem } from "../switches/menu";

export function StateMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const icon = getIcon(s);
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
    <MenuBarExtra.Item
      title={getFriendlyName(s)}
      icon={icon}
      onAction={() => {
        /**/
      }}
    />
  );
}
