import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  confirmAlert,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { isMissingDependency } from "./lib/dependencies";
import { openCommand } from "./lib/launch";
import {
  ProxyStatus,
  getStatus,
  toggleProxy,
  trustRootCertificate,
  untrustRootCertificate,
} from "./lib/mitm";

function render(status: ProxyStatus): string {
  const process = status.running ? `running (pid ${status.pid})` : "stopped";
  const route =
    status.interface && status.interface !== status.service
      ? ` · route via ${status.interface}`
      : "";

  return [
    `### ${status.running ? "🟢 Intercepting" : "⚪️ Idle"}`,
    "",
    `**Process** ${process}`,
    "",
    `**Service** ${status.service ?? "unknown"}${route}`,
    "",
    `**Proxy** ${status.proxy ? "on" : "off"} · **HTTPS** ${status.https ? "on" : "off"}`,
    "",
    `**Root CA** ${status.ca ? "trusted" : "untrusted"}`,
    "",
    `**UI** ${status.ui}`,
    "",
    `**Password** ${status.password ? "••••••••" : "—"}`,
    "",
    `**Bypass** ${status.bypass.join(" ") || "—"}`,
  ].join("\n");
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(getStatus, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Cannot read mitm status" });
    },
  });

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      showFailureToast(error, { title: "mitm failed" });
    }
    revalidate();
  }

  async function removeRootCertificate() {
    const confirmed = await confirmAlert({
      title: "Remove the mitmproxy root CA?",
      message:
        "HTTPS traffic intercepted through mitmproxy will no longer be trusted after this.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await untrustRootCertificate();
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? render(data) : "No status."}
      actions={
        <ActionPanel>
          <Action
            title={data?.running ? "Stop" : "Start"}
            icon={Icon.Power}
            onAction={() => run(toggleProxy)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          {error && isMissingDependency(error) ? (
            <Action
              title="Set up MITM Proxy…"
              icon={Icon.Download}
              onAction={() =>
                openCommand("setup", "Could not open Set Up MITM Proxy")
              }
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open Web UI"
            url={data?.ui ?? "http://127.0.0.1:8081/"}
          />
          {data?.password ? (
            <Action.CopyToClipboard
              title="Copy UI Password"
              content={data.password}
            />
          ) : null}
          {data?.ca ? (
            <Action
              title="Untrust Root CA"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={() => run(removeRootCertificate)}
            />
          ) : (
            <Action
              title="Trust Root CA"
              icon={Icon.CheckCircle}
              onAction={() => run(trustRootCertificate)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
