import { CopyToClipboardMenubarItem, MenuBarSubmenu, OpenInBrowserMenubarItem } from "../menu";
import { capitalizeFirstLetter, getFriendlyName } from "../../utils";
import { State } from "../../haapi";
import { getVideoStreamUrlFromCamera } from "./utils";
import { getIcon } from "../state/utils";

function CameraOpenStreamInBrowserMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return <OpenInBrowserMenubarItem shortcut={{ modifiers: ["cmd"], key: "b" }} url={url} />;
}

export function CameraMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  const subtitle = () => {
    const pos = s.attributes.current_position;
    const cs = capitalizeFirstLetter(s.state);
    if (pos === 100 || pos === 0) {
      return cs;
    }
    const subtitle = pos !== undefined ? `${pos}% ${cs}` : undefined;
    return subtitle;
  };
  return (
    <MenuBarSubmenu key={s.entity_id} title={title()} subtitle={subtitle()} icon={getIcon(s)}>
      <CameraOpenStreamInBrowserMenubarItem state={s} />
      <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
