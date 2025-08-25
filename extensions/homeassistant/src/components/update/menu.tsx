import { MenuBarSubmenu, OpenInMenubarItem } from "@components/menu";
import { CopyEntityIDToClipboard } from "@components/state/menu";
import { getIcon, getStateValue } from "@components/state/utils";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { Icon, MenuBarExtra } from "@raycast/api";
import { HACSRepo, callUpdateInstallService, callUpdateSkipService, getHACSRepositories } from "./utils";

function UpdateOpenReleaseUrlMenubarItem(props: { state: State }) {
  const url = props.state.attributes.release_url;
  if (!url) {
    return null;
  }
  return <OpenInMenubarItem title="Open Release Notes" url={url} />;
}

function UpdateInstallMenubarItem(props: { state: State; backup?: boolean }) {
  const s = props.state;
  if (s.state !== "on") {
    return null;
  }
  if (s.attributes.in_progress !== false) {
    return null;
  }
  return (
    <MenuBarExtra.Item
      title={props.backup === false ? "Update without Backup" : "Update with Backup"}
      icon={Icon.Download}
      onAction={() => callUpdateInstallService(s, { backup: props.backup })}
    />
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
      <UpdateInstallMenubarItem state={s} />
      <UpdateInstallMenubarItem state={s} backup={false} />
      <UpdateSkipMenubarItem state={s} />
      <CopyEntityIDToClipboard state={s} />
    </MenuBarSubmenu>
  );
}

function HACSMenubarItem(props: { repo: HACSRepo | undefined; state: State }) {
  const r = props.repo;
  if (!r || !r.display_name || !r.available_version || !r.name) {
    return null;
  }
  return (
    <MenuBarSubmenu
      title={r.display_name || r.name}
      subtitle={`${r.installed_version} => ${r.available_version}`}
      icon="hacs.svg"
    >
      <OpenInMenubarItem action="Open HACS In" url={ha.navigateUrl("hacs/entry")} />
      <CopyEntityIDToClipboard state={props.state} />
    </MenuBarSubmenu>
  );
}

export function HACSMenubarItems(props: { state: State | undefined }) {
  const s = props.state;
  if (!s) {
    return null;
  }
  if (s.entity_id !== "sensor.hacs") {
    return null;
  }
  const repos = getHACSRepositories(s);
  if (!repos || repos.length <= 0) {
    return null;
  }
  return (
    <>
      {repos?.map((r, i) => (
        <HACSMenubarItem key={i} repo={r} state={s} />
      ))}
    </>
  );
}

export function UpdatesMenubarSection(props: { updates: State[] | undefined; hacs?: State }) {
  const updates = props.updates;
  const hacsRepos = getHACSRepositories(props.hacs);
  if ((!updates || updates.length <= 0) && (!hacsRepos || hacsRepos.length <= 0)) {
    return (
      <MenuBarExtra.Section title="Updates">
        <MenuBarExtra.Item title="No Updates" />
      </MenuBarExtra.Section>
    );
  }
  return (
    <MenuBarExtra.Section title="Updates">
      {updates?.map((b) => (
        <UpdateMenubarItem key={b.entity_id} state={b} />
      ))}
      <HACSMenubarItems state={props.hacs} />
    </MenuBarExtra.Section>
  );
}
