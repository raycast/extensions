import { LastUpdateChangeMenubarItem, MenuBarSubmenu } from "@components/menu";
import { getIcon } from "@components/state/utils";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { capitalizeFirstLetter, getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { Icon, MenuBarExtra, Toast, showToast } from "@raycast/api";
import React from "react";

function CoverOpenMenubarItem(props: { state: State }) {
  if (props.state.attributes.current_position >= 100) {
    return null;
  }
  const handle = async () => {
    try {
      await ha.openCover(props.state.entity_id);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item title="Open" onAction={handle} icon={Icon.ChevronUp} />;
}

function CoverCloseMenubarItem(props: { state: State }) {
  if (props.state.attributes.current_position <= 0) {
    return null;
  }
  const handle = async () => {
    try {
      await ha.closeCover(props.state.entity_id);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item title="Close" onAction={handle} icon={Icon.ChevronDown} />;
}

function CoverStopMenubarItem(props: { state: State }) {
  const handle = async () => {
    try {
      await ha.stopCover(props.state.entity_id);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item title="Stop" onAction={handle} icon={Icon.XMarkCircle} />;
}

export function CoverMenubarItem(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (s.state === "unavailable") {
    return null;
  }
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
      <CoverOpenMenubarItem state={s} />
      <CoverCloseMenubarItem state={s} />
      <CoverStopMenubarItem state={s} />
      <LastUpdateChangeMenubarItem state={s} />
      <RUIMenuBarExtra.CopyToClipboard title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarSubmenu>
  );
}
