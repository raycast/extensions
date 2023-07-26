import { Icon, MenuBarExtra, Toast, showToast } from "@raycast/api";
import { CopyToClipboardMenubarItem } from "../menu";
import { getErrorMessage, getFriendlyName } from "../../utils";
import { State } from "../../haapi";
import { getIcon } from "../states";
import { ha } from "../../common";

function CoverOpenMenubarItem(props: { state: State }) {
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

export function CoverMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.state === "unavailable") {
    return null;
  }
  const friendlyName = getFriendlyName(s);
  const title = () => {
    return friendlyName;
  };
  return (
    <MenuBarExtra.Submenu key={s.entity_id} title={title()} icon={getIcon(s)}>
      <CoverOpenMenubarItem state={s} />
      <CoverCloseMenubarItem state={s} />
      <CoverStopMenubarItem state={s} />
      <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarExtra.Submenu>
  );
}
