import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  open,
} from "@raycast/api";

import { readConfig, type HostbeamConfig } from "./hostbeam";
import { NEEDS, allowedToDrive } from "./permission";

/** The hosts Hostbeam has been given, current one first.
 *
 *  Names come from the config: a host you typed in carries its own, and
 *  everything else is a `~/.ssh/config` alias, which is its own name.
 */
function hosts(
  config: HostbeamConfig | null,
): { id: string; name: string; current: boolean }[] {
  const added = config?.addedIds ?? [];
  const manual = config?.manualHosts ?? [];
  const current = config?.defaultId ?? added[0];
  return added.map((id) => ({
    id,
    name: manual.find((m) => m.id === id)?.name || id,
    current: id === current,
  }));
}

/** Ask Hostbeam to switch, and optionally to beam once it has.
 *
 *  Two links rather than one: `hostbeam://beam` always beams to the current
 *  host, whatever that is, and nothing in this scheme changes a setting as a
 *  side effect of doing something else (ADR 0025). The pause is for the app's
 *  own window to catch up with the switch before the beam is asked for.
 */
async function switchTo(id: string, thenBeam: boolean) {
  // Checked here rather than when the list was drawn: the switch may have
  // been turned on in the seconds since, and a stale reading must not be the
  // reason a command refuses to work.
  if (!(await allowedToDrive(NEEDS.host))) return;
  await closeMainWindow();
  await open(`hostbeam://host?id=${encodeURIComponent(id)}`);
  if (!thenBeam) return;
  await new Promise((resolve) => setTimeout(resolve, 250));
  await open("hostbeam://beam");
}

export default function Command() {
  const config = readConfig();
  const list = hosts(config);
  const allowed = config?.settings?.allowUrlBeam ?? true;
  return (
    <List
      searchBarPlaceholder="Switch the host beams go to"
      // Said before anything is tried, since the list reads fine either way
      // and a row that is going to refuse should look like one.
      navigationTitle={
        allowed ? undefined : "Hostbeam is not accepting commands"
      }
    >
      {list.length === 0 ? (
        <List.EmptyView
          icon={Icon.Desktop}
          title="No hosts yet"
          description={
            config
              ? "Add one in Hostbeam → Preferences → Hosts."
              : "Hostbeam has not run here."
          }
        />
      ) : (
        list.map((host) => (
          <List.Item
            key={host.id}
            icon={host.current ? Icon.CheckCircle : Icon.Circle}
            title={host.name}
            subtitle={host.current ? "current" : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to This Host"
                  icon={Icon.Switch}
                  onAction={() => switchTo(host.id, false)}
                />
                <Action
                  title="Switch and Beam Clipboard"
                  icon={Icon.Upload}
                  onAction={() => switchTo(host.id, true)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
