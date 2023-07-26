import { MenuBarExtra } from "@raycast/api";
import { State } from "../../haapi";
import { getIcon } from "../states";
import { getFriendlyName } from "../../utils";
import { MediaPlayerMenubarItem } from "../mediaplayer/menu";
import { CoverMenubarItem } from "../cover/menu";

export function StateMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const icon = getIcon(s);
  const e = s.entity_id;
  if (e.startsWith("media_player.")) {
    return <MediaPlayerMenubarItem state={s} />;
  } else if (e.startsWith("cover.")) {
    return <CoverMenubarItem state={s} />;
  }
  return (
    <MenuBarExtra.Item
      title={getFriendlyName(s)}
      icon={icon}
      onAction={() => {
        /** */
      }}
    />
  );
}
