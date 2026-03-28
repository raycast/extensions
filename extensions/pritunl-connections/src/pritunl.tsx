import {
  ActionPanel,
  List,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  LocalStorage,
  Form,
  useNavigation,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { useEffect, useRef, useState } from "react";

const execAsync = promisify(exec);

interface PendingConnection {
  protocol: "ovpn" | "wg";
  toast: Toast;
  startedAt: number;
}

interface Profile {
  id: string;
  name: string;
  state: string;
  run_state: string;
  connected: boolean;
  uptime: number;
  status: string;
  server_address: string;
  client_address: string;
}

const CONNECT_TIMEOUT_SECS = (() => {
  const timeout = Number(getPreferenceValues<Preferences>().timeout);
  return Number.isFinite(timeout) ? timeout : 30;
})();

class InvalidCLIPathError extends Error {}

async function resolveLnkTarget(lnkPath: string): Promise<string> {
  const escaped = lnkPath.replace(/'/g, "''");
  const { stdout } = await execAsync(
    `powershell -NoProfile -Command "$sh = New-Object -ComObject WScript.Shell; $sh.CreateShortcut('${escaped}').TargetPath"`,
  );
  return stdout.trim();
}

async function getCLIPath(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.application) {
    throw new InvalidCLIPathError("Could not resolve a valid .exe path from the selected application.");
  }
  if (process.platform === "win32") {
    let exePath = prefs.application.path;
    if (exePath.toLowerCase().endsWith(".lnk")) {
      exePath = await resolveLnkTarget(exePath);
    }
    if (!exePath.toLowerCase().endsWith("pritunl.exe")) {
      throw new InvalidCLIPathError("Could not resolve a valid .exe path from the selected application.");
    }
    return exePath.replace(/pritunl\.exe$/i, "pritunl-client.exe");
  }
  const cliPath = prefs.application.path + "/Contents/Resources/pritunl-client";
  return cliPath;
}

function formatUptime(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h ? `${h}h` : null, m ? `${m}m` : null, `${s}s`].filter(Boolean).join(" ");
}

function TwoFAForm({
  profile,
  protocol,
  onSubmit,
}: {
  profile: Profile;
  protocol: "ovpn" | "wg";
  onSubmit: (code: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Connect ${profile.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Connect"
            icon={Icon.Play}
            onSubmit={(values: { code: string }) => {
              pop();
              onSubmit(values.code.trim());
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Profile: ${profile.name} · Mode: ${protocol.toUpperCase()}`} />
      <Form.TextField id="code" title="PIN Code" placeholder="Enter your PIN / TOTP code" autoFocus />
    </Form>
  );
}

export default function Command() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invalidCLI, setInvalidCLI] = useState(false);
  const [savedProtocols, setSavedProtocols] = useState<Record<string, "ovpn" | "wg">>({});
  const [savedPIN, setSavedPIN] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<Map<string, PendingConnection>>(new Map());
  const isPollingRef = useRef(false);
  const { push } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>("profileProtocols").then((raw) => {
      if (raw) setSavedProtocols(JSON.parse(raw));
    });
    LocalStorage.getItem<string>("profilePIN").then((raw) => {
      if (raw) setSavedPIN(JSON.parse(raw));
    });
  }, []);

  async function saveProtocol(profileId: string, protocol: "ovpn" | "wg") {
    const updated = { ...savedProtocols, [profileId]: protocol };
    setSavedProtocols(updated);
    await LocalStorage.setItem("profileProtocols", JSON.stringify(updated));
  }

  async function togglePIN(profileId: string) {
    const updated = { ...savedPIN, [profileId]: !savedPIN[profileId] };
    setSavedPIN(updated);
    await LocalStorage.setItem("profilePIN", JSON.stringify(updated));
    await showToast({
      style: Toast.Style.Success,
      title: updated[profileId] ? "PIN prompt enabled" : "PIN prompt disabled",
    });
  }

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const cliPath = await getCLIPath();
      const { stdout } = await execAsync(`"${cliPath}" list -j`);
      setInvalidCLI(false);
      const freshProfiles: Profile[] = JSON.parse(stdout);
      freshProfiles.sort((a, b) => a.name.localeCompare(b.name));
      setProfiles(freshProfiles);

      if (freshProfiles.length === 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      for (const [profileId, pending] of pendingRef.current.entries()) {
        const profile = freshProfiles.find((p) => p.id === profileId);
        if (!profile) {
          pendingRef.current.delete(profileId);
          continue;
        }
        if (profile.connected) {
          await pending.toast.hide();
          await showToast({
            style: Toast.Style.Success,
            title: "Connected",
            message: profile.name,
          });
          pendingRef.current.delete(profileId);
          continue;
        }
        if (profile.status === "Connecting") {
          const elapsed = Date.now() / 1000 - pending.startedAt;
          if (elapsed > CONNECT_TIMEOUT_SECS) {
            try {
              await execAsync(`"${cliPath}" stop ${profileId}`);
            } catch {
              /* ignore */
            }
            await pending.toast.hide();
            await showToast({
              style: Toast.Style.Failure,
              title: `Connecting to ${profile.name} failed`,
              message: `timed out (mode: ${pending.protocol.toUpperCase()})`,
            });
            pendingRef.current.delete(profileId);
          } else if (elapsed > 5) {
            pending.toast.message = `still trying (${Math.floor(elapsed)}s)`;
          }
        } else if (profile.run_state !== "Active") {
          pendingRef.current.delete(profileId);
        }
      }
    } catch (err) {
      if (err instanceof InvalidCLIPathError) {
        setInvalidCLI(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load profiles",
          message: String(err),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
    intervalRef.current = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await loadProfiles();
      } finally {
        isPollingRef.current = false;
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function toggleAutostart(profile: Profile) {
    const willEnable = profile.state === "Disabled";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: willEnable ? "Enabling autostart\u2026" : "Disabling autostart\u2026",
      message: profile.name,
    });
    try {
      const cliPath = await getCLIPath();
      await execAsync(`"${cliPath}" ${willEnable ? "enable" : "disable"} ${profile.id}`);
      toast.style = Toast.Style.Success;
      toast.title = willEnable ? "Autostart enabled" : "Autostart disabled";
      toast.message = profile.name;
      await loadProfiles();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Command failed";
      toast.message = String(err);
    }
  }

  async function toggleConnection(profile: Profile, overrideProtocol?: "ovpn" | "wg", totp?: string) {
    const isActive = profile.run_state === "Active";
    const effectiveProtocol = overrideProtocol ?? savedProtocols[profile.id] ?? "ovpn";
    if (overrideProtocol) {
      await saveProtocol(profile.id, overrideProtocol);
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isActive ? `Disconnecting ${profile.name}` : `Connecting ${profile.name}`,
      message: `mode: ${effectiveProtocol.toUpperCase()}`,
    });
    try {
      const cliPath = await getCLIPath();
      if (!isActive) {
        const startCmd = totp
          ? `"${cliPath}" start ${profile.id} -m ${effectiveProtocol} -p ${totp}`
          : `"${cliPath}" start ${profile.id} -m ${effectiveProtocol}`;
        await execAsync(startCmd);
        pendingRef.current.set(profile.id, {
          protocol: effectiveProtocol,
          toast,
          startedAt: Date.now() / 1000,
        });
      } else {
        await execAsync(`"${cliPath}" stop ${profile.id}`);
        pendingRef.current.delete(profile.id);
        toast.style = Toast.Style.Success;
        toast.title = "Disconnected";
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Command failed";
      toast.message = String(err);
    }
  }

  function handleConnectAction(profile: Profile, overrideProtocol?: "ovpn" | "wg") {
    if (profile.run_state === "Active") {
      toggleConnection(profile);
      return;
    }
    if (savedPIN[profile.id]) {
      const protocol = overrideProtocol ?? savedProtocols[profile.id] ?? "ovpn";
      push(
        <TwoFAForm
          profile={profile}
          protocol={protocol}
          onSubmit={(code) => toggleConnection(profile, overrideProtocol, code)}
        />,
      );
    } else {
      toggleConnection(profile, overrideProtocol);
    }
  }
  const invalidCLIView = (
    <List.EmptyView
      icon={Icon.Warning}
      title="Pritunl CLI not found"
      description="Open extension settings and select the Pritunl application."
      actions={
        <ActionPanel>
          <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
  const emptyView = (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="No profiles found"
      description={`Make sure each profile is set as a "System Profile" in the Pritunl client (click the profile → Settings → enable "System Profile", disable "Autostart")`}
    />
  );

  return (
    <List isLoading={isLoading}>
      {invalidCLI
        ? invalidCLIView
        : !isLoading && profiles.length === 0
          ? emptyView
          : profiles.map((profile) => {
              const isActive = profile.run_state === "Active";
              const uptime = formatUptime(profile.uptime);
              return (
                <List.Item
                  key={profile.id}
                  icon={{
                    source: isActive ? Icon.CheckCircle : Icon.Circle,
                    tintColor: isActive ? Color.Green : Color.SecondaryText,
                  }}
                  title={profile.name}
                  subtitle={
                    profile.connected
                      ? "Connected"
                      : profile.status === "Connecting" || profile.status.endsWith("secs")
                        ? "Connecting"
                        : "Disconnected"
                  }
                  accessories={[
                    ...(profile.state === "Enabled"
                      ? [
                          {
                            tag: { value: "Autostart", color: Color.Green },
                            tooltip: "Autostart enabled",
                          },
                        ]
                      : []),
                    ...(savedPIN[profile.id]
                      ? [
                          {
                            tag: { value: "PIN", color: Color.Purple },
                            tooltip: "PIN prompt enabled",
                          },
                        ]
                      : []),
                    ...(profile.connected && profile.status !== "Connecting"
                      ? [{ text: uptime, icon: Icon.Clock, tooltip: "Uptime" }]
                      : []),
                    ...(profile.client_address ? [{ text: profile.client_address, tooltip: "Client IP" }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={isActive ? "Disconnect" : "Connect"}
                        icon={isActive ? Icon.XMarkCircle : Icon.Play}
                        onAction={() => handleConnectAction(profile)}
                      />
                      {!isActive && (
                        <ActionPanel.Section title="Select mode">
                          <Action
                            title="Connect with OpenVPN"
                            icon={Icon.Plug}
                            shortcut={{ modifiers: ["cmd"], key: "v" }}
                            onAction={() => handleConnectAction(profile, "ovpn")}
                          />
                          <Action
                            title="Connect with WireGuard"
                            icon={Icon.Plug}
                            shortcut={{ modifiers: ["cmd"], key: "g" }}
                            onAction={() => handleConnectAction(profile, "wg")}
                          />
                        </ActionPanel.Section>
                      )}
                      <ActionPanel.Section title="Autostart">
                        <Action
                          title={profile.state === "Disabled" ? "Enable Autostart" : "Disable Autostart"}
                          icon={Icon.Power}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                          onAction={() => toggleAutostart(profile)}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="PIN">
                        <Action
                          title={savedPIN[profile.id] ? "Disable PIN Prompt" : "Enable PIN Prompt"}
                          icon={Icon.Lock}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                          onAction={() => togglePIN(profile.id)}
                        />
                      </ActionPanel.Section>
                      <Action
                        title="Settings"
                        icon={Icon.Gear}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={openExtensionPreferences}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
    </List>
  );
}
