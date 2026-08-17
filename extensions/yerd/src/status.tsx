import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runYerd, TIMEOUTS } from "./yerd/cli";
import {
  formatPort,
  formatUptime,
  phpLabel,
  serviceStateIcon,
} from "./helpers/format";
import type {
  LanStatusResponse,
  StatusResponse,
  TunnelStatusResponse,
} from "./yerd/types";
import { DoctorView } from "./components/DoctorView";

const execFileAsync = promisify(execFile);

// Verified via `osascript -e 'id of app "Yerd"'` on 2026-07-29 → dev.yerd.gui
const YERD_BUNDLE_ID = "dev.yerd.gui";

function failureTitle(e: unknown): string {
  return (e as { userMessage?: string }).userMessage ?? "Failed";
}

/** Map serviceStateIcon's string tokens onto Raycast Icon/Color values. */
function getStateIcon(state: string) {
  const visual = serviceStateIcon(state);
  return { source: Icon[visual.icon], tintColor: Color[visual.tintColor] };
}

function StatusRow({
  title,
  value,
  accessory,
}: {
  title: string;
  value: string;
  accessory?: List.Item.Accessory;
}) {
  return (
    <List.Item
      title={title}
      subtitle={value}
      accessories={accessory ? [accessory] : []}
    />
  );
}

export default function Status() {
  const {
    isLoading,
    data: statusData,
    revalidate,
  } = useCachedPromise(() => runYerd<StatusResponse>(["status"]), [], {
    keepPreviousData: true,
  });
  // Sharing probes are optional: swallow the hook toast so a missing
  // tunnel/lan sub-command does not fail the whole dashboard. Errors still
  // land on the hook so the Sharing section can render "Unavailable".
  const { data: tunnelData, error: tunnelError } = useCachedPromise(
    () => runYerd<TunnelStatusResponse>(["tunnel", "status"]),
    [],
    { keepPreviousData: true, onError: () => undefined },
  );
  const { data: lanData, error: lanError } = useCachedPromise(
    () => runYerd<LanStatusResponse>(["lan", "status"]),
    [],
    { keepPreviousData: true, onError: () => undefined },
  );

  const report = statusData?.report;

  async function restartDaemon() {
    const ok = await confirmAlert({
      title: "Restart Yerd Daemon?",
      message: "Sites will be briefly unavailable during restart.",
      primaryAction: { title: "Restart", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restarting daemon…",
    });
    try {
      await runYerd(["restart", "daemon"], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = "Daemon restarted";
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  async function openYerdApp() {
    try {
      await execFileAsync("open", ["-b", YERD_BUNDLE_ID]);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Yerd app",
        message: `Bundle ID: ${YERD_BUNDLE_ID}`,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter status…">
      {report && (
        <>
          <List.Section title="Daemon">
            <StatusRow title="Version" value={report.daemon_version} />
            <StatusRow
              title="Uptime"
              value={formatUptime(report.uptime_secs)}
            />
            <StatusRow title="PID" value={String(report.daemon_pid)} />
          </List.Section>

          <List.Section title="Web">
            <StatusRow
              title="HTTP"
              value={formatPort(
                report.http.bound,
                report.http.requested,
                report.http.fell_back,
              )}
              accessory={
                report.http.fell_back
                  ? {
                      icon: { source: Icon.Warning, tintColor: Color.Yellow },
                      tooltip: `Fell back from port ${report.http.requested}`,
                    }
                  : undefined
              }
            />
            <StatusRow
              title="HTTPS"
              value={formatPort(
                report.https.bound,
                report.https.requested,
                report.https.fell_back,
              )}
              accessory={
                report.https.fell_back
                  ? {
                      icon: { source: Icon.Warning, tintColor: Color.Yellow },
                      tooltip: `Fell back from port ${report.https.requested}`,
                    }
                  : undefined
              }
            />
          </List.Section>

          <List.Section title="DNS & TLS">
            <StatusRow title="DNS" value={report.dns_addr} />
            <StatusRow title="TLD" value={`.${report.tld}`} />
            <StatusRow
              title="Resolver"
              value={report.resolver_installed ? "Installed" : "Not installed"}
              accessory={
                report.resolver_installed
                  ? {
                      icon: {
                        source: Icon.CheckCircle,
                        tintColor: Color.Green,
                      },
                    }
                  : { icon: { source: Icon.XMarkCircle, tintColor: Color.Red } }
              }
            />
            <StatusRow
              title="CA Trust"
              value={
                report.ca.trusted_system ? "System-trusted" : "Not trusted"
              }
              accessory={
                report.ca.trusted_system
                  ? {
                      icon: {
                        source: Icon.CheckCircle,
                        tintColor: Color.Green,
                      },
                    }
                  : { icon: { source: Icon.XMarkCircle, tintColor: Color.Red } }
              }
            />
          </List.Section>

          <List.Section title="PHP">
            <StatusRow title="Default" value={report.default_php} />
            {report.php.map((p) => (
              <List.Item
                key={p.version}
                icon={getStateIcon(p.state)}
                title={phpLabel(p.version, p.installed_patch)}
                subtitle={p.state}
                accessories={
                  p.update_available
                    ? [{ tag: { value: "Update", color: Color.Orange } }]
                    : []
                }
              />
            ))}
          </List.Section>

          <List.Section title="Services">
            {report.services.map((s) => (
              <List.Item
                key={s.service}
                icon={getStateIcon(s.state)}
                title={s.display_name}
                subtitle={`port ${s.port}`}
                accessories={[{ text: s.state }]}
              />
            ))}
          </List.Section>

          <List.Section title="Sites">
            <StatusRow title="Parked" value={String(report.sites.parked)} />
            <StatusRow title="Linked" value={String(report.sites.linked)} />
            <StatusRow title="Secured" value={String(report.sites.secured)} />
          </List.Section>

          <List.Section title="Mail">
            <StatusRow
              title="Capture"
              value={
                report.mail.enabled
                  ? `Enabled on port ${report.mail.port}`
                  : "Disabled"
              }
            />
            <StatusRow title="Unread" value={String(report.mail.unread)} />
          </List.Section>

          <List.Section title="Sharing">
            <StatusRow
              title="LAN"
              value={
                lanError
                  ? "Unavailable"
                  : lanData?.lan_enabled
                    ? `Enabled (${lanData.lan_ip ?? "unknown IP"})`
                    : "Disabled"
              }
            />
            <StatusRow
              title="Tunnel"
              value={
                tunnelError || !tunnelData
                  ? "Unavailable"
                  : tunnelData.cloudflared.installed
                    ? `Cloudflared ${tunnelData.cloudflared.version ?? "installed"}`
                    : "Not installed"
              }
            />
          </List.Section>
        </>
      )}

      <List.Section title="Actions">
        <List.Item
          title="Run Doctor"
          icon={Icon.Heartbeat}
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Doctor"
                icon={Icon.Heartbeat}
                target={<DoctorView />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restart Daemon"
          icon={Icon.RotateClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Restart Daemon"
                icon={Icon.RotateClockwise}
                onAction={restartDaemon}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Open Yerd App"
          icon={Icon.AppWindowGrid3x3}
          actions={
            <ActionPanel>
              <Action
                title="Open Yerd App"
                icon={Icon.AppWindowGrid3x3}
                onAction={openYerdApp}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Open Yerd Docs"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Yerd Docs"
                url="https://yerd.app"
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Refresh"
          icon={Icon.RotateClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
