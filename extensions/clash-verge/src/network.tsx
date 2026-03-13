import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { formatErrorMessage } from "./lib/errors";
import { getMihomoConfig, getProxyHost, setTunEnabled } from "./lib/mihomo";
import { getSystemProxyStatus, setSystemProxyEnabled } from "./lib/system-proxy";
import { SystemProxyStatus } from "./lib/types";
import { VergeGuiConfigState, getVergeGuiConfigState } from "./lib/verge-config";

interface NetworkState {
  systemProxy?: SystemProxyStatus;
  tunEnabled?: boolean;
  mixedPort: number;
  guiConfig: VergeGuiConfigState;
}

export default function NetworkCommand() {
  const [state, setState] = useState<NetworkState | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);
    const guiConfig = getVergeGuiConfigState();

    try {
      const [systemProxy, mihomoConfig] = await Promise.all([getSystemProxyStatus(), getMihomoConfig()]);

      setState({
        systemProxy,
        tunEnabled: mihomoConfig.tunEnabled,
        mixedPort: mihomoConfig.mixedPort,
        guiConfig,
      });
    } catch (error) {
      setState((prev) => ({
        systemProxy: prev?.systemProxy,
        tunEnabled: prev?.tunEnabled,
        mixedPort: prev?.mixedPort ?? 7897,
        guiConfig,
      }));
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleSystemProxyAction = useCallback(
    async (enabled: boolean) => {
      const title = enabled ? "Enabling system proxy..." : "Disabling system proxy...";
      await showToast({ style: Toast.Style.Animated, title });

      try {
        const mixedPort = state?.mixedPort ?? (await getMihomoConfig()).mixedPort;
        await setSystemProxyEnabled(enabled, getProxyHost(), mixedPort);
        await loadState();
        await showToast({
          style: Toast.Style.Success,
          title: enabled ? "System proxy enabled" : "System proxy disabled",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: enabled ? "Failed to enable system proxy" : "Failed to disable system proxy",
          message: formatErrorMessage(error),
        });
      }
    },
    [loadState, state?.mixedPort],
  );

  const handleTunAction = useCallback(
    async (enabled: boolean) => {
      const title = enabled ? "Enabling TUN mode..." : "Disabling TUN mode...";
      await showToast({ style: Toast.Style.Animated, title });

      try {
        await setTunEnabled(enabled);
        await loadState();
        await showToast({
          style: Toast.Style.Success,
          title: enabled ? "TUN mode enabled" : "TUN mode disabled",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: enabled ? "Failed to enable TUN mode" : "Failed to disable TUN mode",
          message: formatErrorMessage(error),
        });
      }
    },
    [loadState],
  );

  const systemProxyEnabled = state?.systemProxy?.enabled ?? false;
  const tunEnabled = state?.tunEnabled ?? false;
  const mismatchMessages = getMismatchMessages(state);
  const hasMismatch = mismatchMessages.length > 0;
  const guiConfigReadError = state?.guiConfig.readError;

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Network}
        title="No Network Controls Available"
        description="Refresh after Clash Verge starts, or clear the search filter to see the available actions."
      />

      {hasMismatch && (
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          title="Runtime and GUI States Differ"
          subtitle={mismatchMessages.join(" | ")}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadState()} />
            </ActionPanel>
          }
        />
      )}

      {guiConfigReadError && (
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
          title="GUI Config Status Unavailable"
          subtitle={guiConfigReadError}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadState()} />
            </ActionPanel>
          }
        />
      )}

      <List.Item
        icon={Icon.Network}
        title="System Proxy"
        subtitle="Manage macOS system proxy for active network services"
        accessories={[
          statusAccessory("Runtime", state?.systemProxy?.enabled),
          statusAccessory("GUI", state?.guiConfig.systemProxyEnabled),
          ...(hasMismatch &&
          state?.systemProxy?.enabled !== undefined &&
          state?.guiConfig.systemProxyEnabled !== undefined
            ? [mismatchAccessory()]
            : []),
        ]}
        actions={
          <ActionPanel>
            <Action
              title={systemProxyEnabled ? "Disable System Proxy" : "Enable System Proxy"}
              onAction={() => void handleSystemProxyAction(!systemProxyEnabled)}
            />
            <Action title="Enable System Proxy" onAction={() => void handleSystemProxyAction(true)} />
            <Action title="Disable System Proxy" onAction={() => void handleSystemProxyAction(false)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadState()} />
          </ActionPanel>
        }
      />

      <List.Item
        icon={Icon.Globe}
        title="TUN Mode"
        subtitle="Manage Mihomo tun.enable via Clash Verge socket API"
        accessories={[
          statusAccessory("Runtime", state?.tunEnabled),
          statusAccessory("GUI", state?.guiConfig.tunEnabled),
          ...(hasMismatch && state?.tunEnabled !== undefined && state?.guiConfig.tunEnabled !== undefined
            ? [mismatchAccessory()]
            : []),
        ]}
        actions={
          <ActionPanel>
            <Action
              title={tunEnabled ? "Disable Tun Mode" : "Enable Tun Mode"}
              onAction={() => void handleTunAction(!tunEnabled)}
            />
            <Action title="Enable Tun Mode" onAction={() => void handleTunAction(true)} />
            <Action title="Disable Tun Mode" onAction={() => void handleTunAction(false)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadState()} />
          </ActionPanel>
        }
      />

      {errorMessage && (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Status Load Failed"
          subtitle={errorMessage}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadState()} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function statusAccessory(source: "Runtime" | "GUI", enabled: boolean | undefined): List.Item.Accessory {
  if (enabled === undefined) {
    return {
      tag: {
        value: `${source}: Unknown`,
      },
    };
  }

  return {
    tag: {
      value: `${source}: ${enabled ? "Enabled" : "Disabled"}`,
      color: enabled ? Color.Green : Color.SecondaryText,
    },
  };
}

function mismatchAccessory(): List.Item.Accessory {
  return {
    icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
    tooltip: "Runtime and GUI states differ",
  };
}

function getMismatchMessages(state: NetworkState | undefined): string[] {
  if (!state) {
    return [];
  }

  const messages: string[] = [];

  if (state.systemProxy?.enabled !== undefined && state.guiConfig.systemProxyEnabled !== undefined) {
    if (state.systemProxy.enabled !== state.guiConfig.systemProxyEnabled) {
      messages.push(
        `System Proxy runtime ${toEnabledText(state.systemProxy.enabled)} but GUI ${toEnabledText(
          state.guiConfig.systemProxyEnabled,
        )}`,
      );
    }
  }

  if (state.tunEnabled !== undefined && state.guiConfig.tunEnabled !== undefined) {
    if (state.tunEnabled !== state.guiConfig.tunEnabled) {
      messages.push(
        `Tun Mode runtime ${toEnabledText(state.tunEnabled)} but GUI ${toEnabledText(state.guiConfig.tunEnabled)}`,
      );
    }
  }

  return messages;
}

function toEnabledText(value: boolean): string {
  return value ? "enabled" : "disabled";
}
