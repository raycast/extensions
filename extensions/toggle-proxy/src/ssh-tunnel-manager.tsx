import {
  ActionPanel,
  Action,
  Icon,
  List,
  Form,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  environment,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadFullSshConfig, SshHostEntry } from "./utils/ssh-config-parser";
import { tmux, ENV_PATH } from "./utils/exec";
import { safePort, sanitizeShellArg } from "./utils/types";
import * as path from "path";

/** Type for an actually active tunnel (running in tmux) */
type TunnelInfo = {
  sessionName: string;
  host: string;
  localPort: number;
  remotePort: number;
  createdAt: number;
};

/** Type for "recent" tunnels (storing minimal info for quick re-creation) */
type RecentTunnel = {
  host: string;
  localPort: number;
  remotePort: number;
  lastUsedAt: number;
};

async function getStoredArray<T>(key: string): Promise<T[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function listTmuxSessions(): Promise<string[]> {
  try {
    const { stdout } = await tmux("list-sessions -F '#S'");
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Updates the "recentTunnels" list in LocalStorage and useState,
 * keeping the last 10 entries and moving duplicates to the top.
 */
async function updateRecentTunnels(
  host: string,
  localPort: number,
  remotePort: number,
  setRecentState: React.Dispatch<React.SetStateAction<RecentTunnel[]>>,
) {
  let list = await getStoredArray<RecentTunnel>("recentTunnels");

  list = list.filter((x) => !(x.host === host && x.localPort === localPort && x.remotePort === remotePort));

  const newRec: RecentTunnel = {
    host,
    localPort,
    remotePort,
    lastUsedAt: Date.now(),
  };
  list.unshift(newRec);

  if (list.length > 10) {
    list.splice(10);
  }

  await LocalStorage.setItem("recentTunnels", JSON.stringify(list));
  setRecentState(list);
}

function buildSshTunnelCmd(sessionName: string, localPort: number, remotePort: number, host: string): string {
  const safeSession = sanitizeShellArg(sessionName);
  const safeLocalPort = safePort(String(localPort));
  const safeRemotePort = safePort(String(remotePort));
  const safeHost = sanitizeShellArg(host);
  const logDir = path.join(environment.supportPath, "logs");
  const logFile = path.join(logDir, `tunnel-${safeSession}.log`);

  return `new-session -d -s ${safeSession} "export PATH='${ENV_PATH}' && mkdir -p '${logDir}' && ssh -L ${safeLocalPort}:127.0.0.1:${safeRemotePort} ${safeHost} -N > '${logFile}' 2>&1"`;
}

export default function SSHTunnelManager() {
  const [activeTunnels, setActiveTunnels] = useState<TunnelInfo[]>([]);
  const [recentTunnels, setRecentTunnels] = useState<RecentTunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const storedTunnels = await getStoredArray<TunnelInfo>("sshTunnels");
        const runningSessions = await listTmuxSessions();

        const filtered = storedTunnels.filter((t) => runningSessions.includes(t.sessionName));

        if (filtered.length !== storedTunnels.length) {
          await LocalStorage.setItem("sshTunnels", JSON.stringify(filtered));
        }
        setActiveTunnels(filtered);

        const recentList = await getStoredArray<RecentTunnel>("recentTunnels");
        setRecentTunnels(recentList);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Kill the tmux session and remove the tunnel from LocalStorage. */
  async function killTunnel(tunnel: TunnelInfo) {
    try {
      const safeName = sanitizeShellArg(tunnel.sessionName);
      await tmux(`kill-session -t ${safeName}`);
      const newTunnels = activeTunnels.filter((t) => t.sessionName !== tunnel.sessionName);
      setActiveTunnels(newTunnels);
      await LocalStorage.setItem("sshTunnels", JSON.stringify(newTunnels));
      showToast(Toast.Style.Success, `Tunnel to ${tunnel.host} stopped`);
    } catch (err) {
      showToast(Toast.Style.Failure, "Failed to stop tunnel", String(err));
    }
  }

  /** Display the new tunnel creation form. */
  function openNewTunnelForm() {
    push(
      <NewTunnelForm
        onTunnelCreated={(newTunnel) => setActiveTunnels([...activeTunnels, newTunnel])}
        onRecentTunnelsUpdate={setRecentTunnels}
      />,
    );
  }

  /** Delete a recent tunnel entry. */
  async function deleteRecentTunnel(rt: RecentTunnel) {
    if (
      await confirmAlert({
        title: "Delete Recent Tunnel?",
        message: `${rt.host} (Local: ${rt.localPort} → Remote: ${rt.remotePort})`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const list = (await getStoredArray<RecentTunnel>("recentTunnels")).filter(
        (x) => !(x.host === rt.host && x.localPort === rt.localPort && x.remotePort === rt.remotePort),
      );
      await LocalStorage.setItem("recentTunnels", JSON.stringify(list));
      setRecentTunnels(list);
      showToast(Toast.Style.Success, "Recent tunnel deleted");
    }
  }

  /** Edit a recent tunnel (update ports). */
  function editRecentTunnel(rt: RecentTunnel) {
    push(
      <EditTunnelForm
        tunnel={rt}
        onSave={async (updated) => {
          let list = await getStoredArray<RecentTunnel>("recentTunnels");
          list = list.map((x) =>
            x.host === rt.host && x.localPort === rt.localPort && x.remotePort === rt.remotePort ? updated : x,
          );
          await LocalStorage.setItem("recentTunnels", JSON.stringify(list));
          setRecentTunnels(list);
        }}
      />,
    );
  }

  /** Quick launch a tunnel from "recent" entries (RecentTunnel). */
  async function quickLaunch(t: RecentTunnel) {
    try {
      const sessionName = sanitizeShellArg(t.host + "_" + t.localPort);

      const runningSessions = await listTmuxSessions();
      if (runningSessions.includes(sessionName)) {
        showToast(Toast.Style.Failure, `Session "${sessionName}" is already active!`);
        return;
      }

      const cmd = buildSshTunnelCmd(sessionName, t.localPort, t.remotePort, t.host);
      await tmux(cmd);

      const newTunnel: TunnelInfo = {
        sessionName,
        host: t.host,
        localPort: t.localPort,
        remotePort: t.remotePort,
        createdAt: Date.now(),
      };

      const storedTunnels = await getStoredArray<TunnelInfo>("sshTunnels");
      storedTunnels.push(newTunnel);
      await LocalStorage.setItem("sshTunnels", JSON.stringify(storedTunnels));

      setActiveTunnels((prev) => [...prev, newTunnel]);

      updateRecentTunnels(t.host, t.localPort, t.remotePort, setRecentTunnels);

      showToast(Toast.Style.Success, `Tunnel to ${t.host} started`);
    } catch (err) {
      showToast(Toast.Style.Failure, "Error starting SSH tunnel", String(err));
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Manage SSH tunnels">
      {error && <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error} />}

      {/* Recent tunnels section */}
      {!error && recentTunnels.length > 0 && (
        <List.Section title="Recent Connections (Quick Launch)">
          {recentTunnels.map((rt, idx) => (
            <List.Item
              key={`recent-${idx}-${rt.host}`}
              icon={Icon.ArrowClockwise}
              title={rt.host}
              subtitle={`Local: ${rt.localPort} → Remote: ${rt.remotePort}`}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Play} title="Quick Launch" onAction={() => quickLaunch(rt)} />
                  <Action
                    icon={Icon.Pencil}
                    title="Edit Tunnel"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => editRecentTunnel(rt)}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Tunnel"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteRecentTunnel(rt)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Active tunnels section */}
      {!error && activeTunnels.length > 0 && (
        <List.Section title="Active Tunnels">
          {activeTunnels.map((t) => (
            <List.Item
              key={t.sessionName}
              title={t.host}
              subtitle={`Local: ${t.localPort} → Remote: ${t.remotePort}`}
              accessories={[{ text: new Date(t.createdAt).toLocaleString() }]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    title="Stop Tunnel"
                    onAction={() => killTunnel(t)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* New tunnel button */}
      {!error && (
        <List.Item
          key="new-tunnel"
          icon={Icon.Plus}
          title="Add New SSH Tunnel"
          subtitle="Create a new connection"
          actions={
            <ActionPanel>
              <Action title="Open Form" icon={Icon.Plus} onAction={openNewTunnelForm} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

/**
 * New tunnel creation form
 */
function NewTunnelForm(props: {
  onTunnelCreated: (tunnel: TunnelInfo) => void;
  onRecentTunnelsUpdate: React.Dispatch<React.SetStateAction<RecentTunnel[]>>;
}) {
  const { onTunnelCreated, onRecentTunnelsUpdate } = props;
  const [hosts, setHosts] = useState<SshHostEntry[]>([]);
  const [selectedHost, setSelectedHost] = useState("");
  const [localPort, setLocalPort] = useState("5432");
  const [remotePort, setRemotePort] = useState("5432");
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    try {
      const seen = new Set<string>();
      const allHosts = loadFullSshConfig().filter((h) => {
        const name = h.host.trim();
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      });
      if (!allHosts.length) {
        setInfo("No hosts found (possibly all commented out or wildcards).");
      }
      setHosts(allHosts);
    } catch (err) {
      setInfo(`Error reading ~/.ssh/config: ${err}`);
    }
  }, []);

  async function handleSubmit() {
    if (!selectedHost) {
      showToast(Toast.Style.Failure, "Please select a host from the list");
      return;
    }
    if (!localPort || !remotePort) {
      showToast(Toast.Style.Failure, "Please specify local and remote ports");
      return;
    }

    const sessionName = sanitizeShellArg(selectedHost);
    const lPortNum = parseInt(localPort, 10);
    const rPortNum = parseInt(remotePort, 10);

    if (isNaN(lPortNum) || isNaN(rPortNum) || lPortNum < 1 || rPortNum < 1 || lPortNum > 65535 || rPortNum > 65535) {
      showToast(Toast.Style.Failure, "Port must be a number between 1 and 65535");
      return;
    }

    try {
      const runningSessions = await listTmuxSessions();
      if (runningSessions.includes(sessionName)) {
        showToast(Toast.Style.Failure, `Session "${sessionName}" is already active!`);
        return;
      }

      const cmd = buildSshTunnelCmd(sessionName, lPortNum, rPortNum, sessionName);
      await tmux(cmd);

      const newTunnel: TunnelInfo = {
        sessionName,
        host: sessionName,
        localPort: lPortNum,
        remotePort: rPortNum,
        createdAt: Date.now(),
      };

      const storedTunnels = await getStoredArray<TunnelInfo>("sshTunnels");
      storedTunnels.push(newTunnel);
      await LocalStorage.setItem("sshTunnels", JSON.stringify(storedTunnels));

      onTunnelCreated(newTunnel);

      updateRecentTunnels(sessionName, lPortNum, rPortNum, onRecentTunnelsUpdate);

      showToast(Toast.Style.Success, `Tunnel to ${sessionName} created successfully`);
    } catch (err) {
      showToast(Toast.Style.Failure, "Error starting SSH tunnel", String(err));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tunnel" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {info && <Form.Description title="Info" text={info} />}

      <Form.Dropdown id="sshHost" title="Host from ~/.ssh/config" value={selectedHost} onChange={setSelectedHost}>
        {hosts.map((h, idx) => (
          <Form.Dropdown.Item key={`${h.host}-${idx}`} value={h.host} title={h.host} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="localPort"
        title="Local Port"
        value={localPort}
        onChange={setLocalPort}
        placeholder="e.g., 10800"
      />

      <Form.TextField
        id="remotePort"
        title="Remote Port"
        value={remotePort}
        onChange={setRemotePort}
        placeholder="e.g., 80"
      />
    </Form>
  );
}

/**
 * Edit tunnel form for modifying recent tunnel ports
 */
function EditTunnelForm(props: { tunnel: RecentTunnel; onSave: (updated: RecentTunnel) => Promise<void> }) {
  const { tunnel, onSave } = props;
  const [localPort, setLocalPort] = useState(String(tunnel.localPort));
  const [remotePort, setRemotePort] = useState(String(tunnel.remotePort));
  const { pop } = useNavigation();

  async function handleSubmit() {
    const lPortNum = parseInt(localPort, 10);
    const rPortNum = parseInt(remotePort, 10);

    if (isNaN(lPortNum) || isNaN(rPortNum) || lPortNum < 1 || rPortNum < 1 || lPortNum > 65535 || rPortNum > 65535) {
      showToast(Toast.Style.Failure, "Port must be a number between 1 and 65535");
      return;
    }

    await onSave({ ...tunnel, localPort: lPortNum, remotePort: rPortNum, lastUsedAt: Date.now() });
    showToast(Toast.Style.Success, "Tunnel updated");
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Host" text={tunnel.host} />

      <Form.TextField
        id="localPort"
        title="Local Port"
        value={localPort}
        onChange={setLocalPort}
        placeholder="e.g., 10800"
      />

      <Form.TextField
        id="remotePort"
        title="Remote Port"
        value={remotePort}
        onChange={setRemotePort}
        placeholder="e.g., 80"
      />
    </Form>
  );
}
