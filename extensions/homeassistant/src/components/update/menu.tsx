import { Icon, MenuBarExtra } from "@raycast/api";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { getIcon, getStateValue } from "@components/state/utils";
import { MenuBarSubmenu, OpenInBrowserMenubarItem } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { callUpdateInstallService, callUpdateSkipService } from "./utils";

function UpdateOpenReleaseUrlMenubarItem(props: { state: State }) {
  const url = props.state.attributes.release_url;
  if (!url) {
    return null;
  }
  return <OpenInBrowserMenubarItem title="Open Release Notes" url={url} />;
}

function UpdateWithBackupMenubarItem(props: { state: State }) {
  const s = props.state;
  if (s.state !== "on") {
    return null;
  }
  if (s.attributes.in_progress !== false) {
    return null;
  }
  return (
    <MenuBarExtra.Item title="Update with Backup" icon={Icon.Download} onAction={() => callUpdateInstallService(s)} />
  );
}

function UpdateSkipMenubarItem(props: { state: State }) {
  const s = props.state;
  if (s.state !== "on") {
    return null;
  }
  if (s.attributes.in_progress !== false) {
    return null;
  }
  return <MenuBarExtra.Item title="Skip Update" icon={Icon.ArrowRight} onAction={() => callUpdateSkipService(s)} />;
}

export function UpdateMenubarItem(props: { state: State }) {
  const s = props.state;
  return (
    <MenuBarSubmenu title={getFriendlyName(s)} subtitle={getStateValue(s)} icon={getIcon(s)}>
      <UpdateOpenReleaseUrlMenubarItem state={s} />
      <UpdateWithBackupMenubarItem state={s} />
      <UpdateSkipMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}

export function UpdatesMenubarSection(props: { updates: State[] | undefined }) {
  const updates = props.updates;
  if (!updates || updates.length <= 0) {
    return (
      <MenuBarExtra.Section title="Updates">
        <MenuBarExtra.Item title="No Updates" />
      </MenuBarExtra.Section>
    );
  }
  return (
    <MenuBarExtra.Section title="Updates">
      {updates?.map((b) => <UpdateMenubarItem key={b.entity_id} state={b} />)}
    </MenuBarExtra.Section>
  );
}
