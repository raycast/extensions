import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { loadAppConfig } from "./lib/config.js";
import {
  getDaemonStatus,
  pingDaemon,
  startDaemon,
  stopDaemon,
} from "./lib/daemon-control.js";
import { serializeCredentialsForDaemon } from "./lib/credentials.js";

type Preferences = {
  proxyPort: string;
};

type State = {
  markdown: string;
  loading: boolean;
};

async function refresh(
  proxyPort: string,
  setState: (state: State) => void,
  options: { autoStart?: boolean } = {},
) {
  setState({ loading: true, markdown: "Checking proxy..." });
  try {
    const config = await loadAppConfig(proxyPort);
    let status = await getDaemonStatus();
    let note = "";
    if (!status.running && options.autoStart !== false) {
      status = await startDaemon({
        ...config,
        credentials: await serializeCredentialsForDaemon(),
      });
      note = "Proxy was stopped and has been started.";
    }
    const healthy = await pingDaemon(config.port, config.token);
    setState({
      loading: false,
      markdown: [
        "# ChatGPT Provider Proxy",
        "",
        `Port: \`${config.port}\``,
        `Process: ${status.running ? `running, pid \`${status.pid}\`` : "stopped"}`,
        `Health: ${healthy ? "ok" : "not reachable"}`,
        `Log: \`${status.logPath}\``,
        note ? `\n${note}` : "",
      ].join("\n"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ loading: false, markdown: message });
  }
}

async function start(proxyPort: string, setState: (state: State) => void) {
  setState({ loading: true, markdown: "Starting proxy..." });
  try {
    const config = await loadAppConfig(proxyPort);
    await startDaemon({
      ...config,
      credentials: await serializeCredentialsForDaemon(),
    });
    await showToast({ style: Toast.Style.Success, title: "Proxy started" });
    await refresh(proxyPort, setState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ loading: false, markdown: message });
    await showToast({
      style: Toast.Style.Failure,
      title: "Start failed",
      message,
    });
  }
}

async function stop(proxyPort: string, setState: (state: State) => void) {
  setState({ loading: true, markdown: "Stopping proxy..." });
  await stopDaemon();
  await showToast({ style: Toast.Style.Success, title: "Proxy stopped" });
  await refresh(proxyPort, setState, { autoStart: false });
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({
    loading: true,
    markdown: "Starting proxy...",
  });

  useEffect(() => {
    void refresh(preferences.proxyPort, setState);
  }, [preferences.proxyPort]);

  return (
    <Detail
      markdown={state.markdown}
      isLoading={state.loading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            onAction={() => void refresh(preferences.proxyPort, setState)}
          />
          <Action
            title="Start Proxy"
            onAction={() => void start(preferences.proxyPort, setState)}
          />
          <Action
            title="Stop Proxy"
            style={Action.Style.Destructive}
            onAction={() => void stop(preferences.proxyPort, setState)}
          />
        </ActionPanel>
      }
    />
  );
}
