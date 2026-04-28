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
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { useEffect, useRef, useState } from "react";

const execFileAsync = promisify(execFile);

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
  const { stdout } = await execFileAsync("powershell", [
    "-NoProfile",
    "-Command",
    `$sh = New-Object -ComObject WScript.Shell; $sh.CreateShortcut('${escaped}').TargetPath`,
  ]);
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
  const [codeError, setCodeError] = useState<string | undefined>();

  function handleCodeChange(value: string) {
    if (value.length === 0) {
      setCodeError("PIN code is required");
    } else if (!/^\d+$/.test(value.trim())) {
      setCodeError("PIN must contain only digits");
    } else {
      setCodeError(undefined);
    }
  }

  return (
    <Form
      navigationTitle={`Connect ${profile.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Connect"
            icon={Icon.Play}
            onSubmit={(values: { code: string }) => {
              const trimmed = values.code.trim();
              if (!trimmed || !/^\d+$/.test(trimmed)) {
                setCodeError("Enter a valid numeric PIN code");
                return;
              }
              pop();
              onSubmit(trimmed);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Profile: ${profile.name} · Mode: ${protocol.toUpperCase()}`} />
      <Form.TextField
        id="code"
        title="PIN Code"
        placeholder="Enter your PIN / TOTP code"
        autoFocus
        error={codeError}
        onChange={handleCodeChange}
      />
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
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>("profileProtocols");
        if (raw) setSavedProtocols(JSON.parse(raw));
      } catch {
        await LocalStorage.removeItem("profileProtocols");
      }
      try {
        const raw = await LocalStorage.getItem<string>("profilePIN");
        if (raw) setSavedPIN(JSON.parse(raw));
      } catch {
        await LocalStorage.removeItem("profilePIN");
      }
    })();
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

  async function loadProfiles(initial = false) {
    if (initial) setIsLoading(true);
    try {
      const cliPath = await getCLIPath();
      const { stdout } = await execFileAsync(cliPath, ["list", "-j"]);
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
              await execFileAsync(cliPath, ["stop", profileId]);
            } catch {
              /* ignore */
            }
            await pending.toast.hide();
            await showFailureToast(new Error(`timed out (mode: ${pending.protocol.toUpperCase()})`), {
              title: `Connecting to ${profile.name} failed`,
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
        await showFailureToast(err, { title: "Failed to load profiles" });
      }
    } finally {
      if (initial) setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles(true);
    intervalRef.current = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await loadProfiles();
      } finally {
        isPollingRef.current = false;
      }
    }, 3000);
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
      await execFileAsync(cliPath, [willEnable ? "enable" : "disable", profile.id]);
      toast.style = Toast.Style.Success;
      toast.title = willEnable ? "Autostart enabled" : "Autostart disabled";
      toast.message = profile.name;
      await loadProfiles();
    } catch (err) {
      await toast.hide();
      await showFailureToast(err, { title: "Command failed" });
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
        const startArgs = totp
          ? ["start", profile.id, "-m", effectiveProtocol, "-p", totp]
          : ["start", profile.id, "-m", effectiveProtocol];
        await execFileAsync(cliPath, startArgs);
        pendingRef.current.set(profile.id, {
          protocol: effectiveProtocol,
          toast,
          startedAt: Date.now() / 1000,
        });
      } else {
        await execFileAsync(cliPath, ["stop", profile.id]);
        pendingRef.current.delete(profile.id);
        toast.style = Toast.Style.Success;
        toast.title = "Disconnected";
      }
    } catch (err) {
      await toast.hide();
      await showFailureToast(err, { title: "Command failed" });
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
              const isConnecting =
                !profile.connected && (profile.status === "Connecting" || profile.status.endsWith("secs"));
              const uptime = formatUptime(profile.uptime);
              return (
                <List.Item
                  key={profile.id}
                  icon={{
                    source: isConnecting ? Icon.CircleProgress75 : profile.connected ? Icon.CheckCircle : Icon.Circle,
                    tintColor: isConnecting ? Color.Blue : profile.connected ? Color.Green : Color.SecondaryText,
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
