import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ProxyStatus, getStatus, runMitm } from "./lib/mitm";

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
  const { data, isLoading, revalidate } = usePromise(getStatus, [], {
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot read mitm status",
        message: error.message,
      });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? render(data) : "No status."}
      actions={
        <ActionPanel>
          <Action
            title={data?.running ? "Stop" : "Start"}
            icon={Icon.Power}
            onAction={async () => {
              await runMitm(["toggle"]);
              revalidate();
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
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
              onAction={async () => {
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
                await runMitm(["untrust"]);
                revalidate();
              }}
            />
          ) : (
            <Action
              title="Trust Root CA"
              icon={Icon.CheckCircle}
              onAction={async () => {
                await runMitm(["trust"]);
                revalidate();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
