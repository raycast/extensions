import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  open,
  showHUD,
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

/** How long a switch gets to land before the beam is called off. A cold start
 *  is the slow case — the app launches, then its window collects the parked
 *  switch — and the app itself drops a parked ask after 10 seconds. */
const SWITCH_WAIT_MS = 8000;

/** Whether Hostbeam has made `id` its current host, read back from its own
 *  config. The app writes that file as soon as its window has taken the
 *  switch, so seeing it there means the switch has really happened. */
async function switched(id: string): Promise<boolean> {
  const until = Date.now() + SWITCH_WAIT_MS;
  for (;;) {
    if (readConfig()?.defaultId === id) return true;
    if (Date.now() >= until) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Ask Hostbeam to switch, and optionally to beam once it has.
 *
 *  Two links rather than one: `hostbeam://beam` always beams to the current
 *  host, whatever that is, and nothing in this scheme changes a setting as a
 *  side effect of doing something else (ADR 0025). That is also why the beam
 *  waits for the switch to show up in the app's config rather than for a fixed
 *  pause: a window that was slow to take the switch — hidden, or still
 *  starting — would otherwise send the screenshot to the host being left.
 */
async function switchTo(host: { id: string; name: string }, thenBeam: boolean) {
  // Checked here rather than when the list was drawn: the switch may have
  // been turned on in the seconds since, and a stale reading must not be the
  // reason a command refuses to work.
  if (!(await allowedToDrive(NEEDS.host))) return;
  await closeMainWindow();
  await open(`hostbeam://host?id=${encodeURIComponent(host.id)}`);
  if (!thenBeam) return;
  if (!(await switched(host.id))) {
    await showHUD(
      `Hostbeam did not switch to ${host.name}, so nothing was beamed`,
    );
    return;
  }
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
                  onAction={() => switchTo(host, false)}
                />
                <Action
                  title="Switch and Beam Clipboard"
                  icon={Icon.Upload}
                  onAction={() => switchTo(host, true)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
