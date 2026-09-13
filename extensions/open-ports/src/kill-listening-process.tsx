import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { HiddenListener } from "./core/netstat";
import { pluralize } from "./core/ports";
import { rankListeners } from "./core/search";
import { isValidPid } from "./core/signals";
import { Listener, ProcessDetails } from "./core/types";
import { HiddenListenerItem } from "./ui/hidden-listener-item";
import { killTarget, killTargetAsAdmin, killTargetForProcess } from "./ui/kill-flow";
import { ListenerActions } from "./ui/listener-actions";
import { getSettings } from "./ui/preferences";
import { exposureMeta, ipVersionLabel, listItemIcon } from "./ui/presentation";
import { SHORTCUTS } from "./ui/shortcuts";
import { useListeners } from "./ui/use-listeners";

export default function KillListeningProcess() {
  const [query, setQuery] = useState("");
  const { listeners, processes, hidden, isLoading, revalidate, reloadAsAdmin } = useListeners();

  const pid = parsePid(query);
  const matches = useMemo(() => rankListeners(listeners, query), [listeners, query]);
  const hiddenMatches = useMemo(() => hidden.filter((entry) => matchesQuery(entry, query)), [hidden, query]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type a PID or port, or search by process name…"
      navigationTitle="Kill Listening Process"
    >
      <List.EmptyView
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
        title={isLoading ? "Reading open ports…" : "Nothing to kill"}
        description={
          query.length > 0
            ? `No listening process matches "${query}". Type a plain PID to kill a process that is not listening on a port.`
            : "No process is listening on a TCP port right now."
        }
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.reload} onAction={revalidate} />
            <Action
              title="Reload as Administrator"
              icon={Icon.Key}
              shortcut={SHORTCUTS.reloadAsAdmin}
              onAction={reloadAsAdmin}
            />
          </ActionPanel>
        }
      />

      {pid !== undefined ? (
        <List.Section title="Kill by PID">
          <PidItem
            pid={pid}
            details={processes.get(pid)}
            ports={listeners.filter((listener) => listener.pid === pid).map((listener) => listener.port)}
            onChanged={revalidate}
          />
        </List.Section>
      ) : null}

      <List.Section
        title={query.length > 0 ? "Matching Listeners" : "Listening Processes"}
        subtitle={matches.length > 0 ? pluralize(matches.length, "process", "processes") : undefined}
      >
        {matches.map((listener) => (
          <List.Item
            key={listener.id}
            icon={listItemIcon(listener)}
            title={listener.command}
            subtitle={`:${listener.port}`}
            accessories={accessoriesFor(listener)}
            actions={
              <ListenerActions
                listener={listener}
                details={processes.get(listener.pid)}
                onChanged={revalidate}
                onReloadAsAdmin={reloadAsAdmin}
                killFirst
              />
            }
          />
        ))}
      </List.Section>

      {hiddenMatches.length > 0 ? (
        <List.Section title="Owned by Another User" subtitle={pluralize(hiddenMatches.length, "listener")}>
          {hiddenMatches.map((entry) => (
            <HiddenListenerItem key={entry.id} hidden={entry} onReload={revalidate} onReloadAsAdmin={reloadAsAdmin} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

/** Kills a PID typed straight into the search bar, whether or not it holds a port. */
function PidItem(props: { pid: number; details?: ProcessDetails; ports: number[]; onChanged: () => void }) {
  const { pid, details, ports, onChanged } = props;
  const settings = getSettings();

  if (!details) {
    return (
      <List.Item
        icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }}
        title={`PID ${pid}`}
        subtitle="No running process with this PID"
        accessories={[{ text: "Nothing to kill" }]}
      />
    );
  }

  const target = killTargetForProcess(details, ports[0]);
  const killOptions = { confirm: settings.confirmKill, onChanged };

  return (
    <List.Item
      icon={{ source: Icon.BullsEye, tintColor: Color.Red }}
      title={`Kill PID ${pid}`}
      subtitle={details.commandLine}
      accessories={[
        ports.length > 0
          ? { tag: { value: ports.map((port) => `:${port}`).join(" "), color: Color.Orange } }
          : { tag: { value: "Not listening", color: Color.SecondaryText } },
        { icon: Icon.Person, text: details.user },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Terminate">
            <Action
              title={`Kill PID ${pid} (${settings.defaultSignal})`}
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={SHORTCUTS.kill}
              onAction={() => killTarget(target, settings.defaultSignal, killOptions)}
            />
            <Action
              title={`Force Kill PID ${pid} (SIGKILL)`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={SHORTCUTS.forceKill}
              onAction={() => killTarget(target, "SIGKILL", killOptions)}
            />
            <Action
              title="Force Kill as Administrator"
              icon={Icon.Key}
              style={Action.Style.Destructive}
              shortcut={SHORTCUTS.killAsAdmin}
              onAction={() => killTargetAsAdmin(target, "SIGKILL", killOptions)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Command Line" content={details.commandLine} icon={Icon.Code} />
            <Action.CopyToClipboard
              title="Copy Kill Command"
              content={`kill -9 ${pid}`}
              icon={Icon.Terminal}
              shortcut={SHORTCUTS.copyKillCommand}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/**
 * Only a plain positive integer counts as a PID. Rejecting everything else here keeps
 * values such as `0` (which `kill` would read as "my whole process group") out of the UI.
 */
function parsePid(query: string): number | undefined {
  const trimmed = query.trim();
  if (!/^\d{1,10}$/.test(trimmed)) return undefined;

  const pid = Number(trimmed);
  return isValidPid(pid) ? pid : undefined;
}

/** Hidden entries have no process to search, so only the port and address can match. */
function matchesQuery(entry: HiddenListener, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return [String(entry.port), ...entry.addresses].join(" ").toLowerCase().includes(needle);
}

function accessoriesFor(listener: Listener): List.Item.Accessory[] {
  const exposure = exposureMeta(listener.exposure);

  return [
    { text: { value: listener.bindings[0].address, color: Color.SecondaryText }, tooltip: exposure.description },
    { tag: { value: ipVersionLabel(listener), color: exposure.color }, tooltip: exposure.description },
    { icon: Icon.Person, text: listener.user },
    { text: `PID ${listener.pid}` },
  ];
}
