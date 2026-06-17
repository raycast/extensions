import { LastUpdateChangeMenubarItem, MenuBarSubmenu, OpenInMenubarItem } from "@components/menu";
import { getIcon } from "@components/state/utils";
import { State } from "@lib/haapi";
import { capitalizeFirstLetter, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import React from "react";
import { getVideoStreamUrlFromCamera } from "./utils";

function CameraOpenStreamInBrowserMenubarItem(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return <OpenInMenubarItem shortcut={{ modifiers: ["cmd"], key: "b" }} url={url} />;
}

export function CameraMenubarItem(props: { state: State }): React.ReactElement | null {
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
      <LastUpdateChangeMenubarItem state={s} />
      <RUIMenuBarExtra.CopyToClipboard title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
