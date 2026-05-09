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
import { installProvider, removeProvider } from "./lib/provider-yaml.js";
import { raycastProvidersPath } from "./lib/paths.js";

type Preferences = {
  proxyPort: string;
};

type State = {
  message: string;
  loading: boolean;
};

async function install(setState: (state: State) => void, proxyPort: string) {
  setState({ loading: true, message: "Installing provider..." });
  try {
    const config = await loadAppConfig(proxyPort);
    const result = await installProvider(config);
    const backup = result.backupPath
      ? `\n\nBackup: \`${result.backupPath}\``
      : "";
    setState({
      loading: false,
      message: `Installed provider at \`${result.path}\`.${backup}`,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Raycast provider installed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ loading: false, message });
    await showToast({
      style: Toast.Style.Failure,
      title: "Install failed",
      message,
    });
  }
}

async function uninstall(setState: (state: State) => void) {
  setState({ loading: true, message: "Removing provider..." });
  try {
    const removed = await removeProvider();
    setState({
      loading: false,
      message: removed
        ? "Removed provider from Raycast config."
        : "Provider was not installed.",
    });
    await showToast({
      style: Toast.Style.Success,
      title: removed ? "Provider removed" : "No provider found",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ loading: false, message });
    await showToast({
      style: Toast.Style.Failure,
      title: "Remove failed",
      message,
    });
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({
    loading: false,
    message: `Provider path: \`${raycastProvidersPath()}\``,
  });

  useEffect(() => {
    setState({
      loading: false,
      message: `Provider path: \`${raycastProvidersPath()}\``,
    });
  }, []);

  return (
    <Detail
      markdown={`# Raycast AI Provider\n\n${state.message}\n\nAfter installation, restart Raycast if the model picker does not refresh immediately.`}
      isLoading={state.loading}
      actions={
        <ActionPanel>
          <Action
            title="Install Provider"
            onAction={() => void install(setState, preferences.proxyPort)}
          />
          <Action
            title="Remove Provider"
            style={Action.Style.Destructive}
            onAction={() => void uninstall(setState)}
          />
        </ActionPanel>
      }
    />
  );
}
