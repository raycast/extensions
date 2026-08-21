import { Color, Icon, MenuBarExtra, environment, open } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "./api";
import { getHealthDetailed, HealthDetailed } from "./hermes-client";

interface MenuBarState {
  health?: HealthDetailed;
  error?: string;
}

function statusIcon(state: MenuBarState): { source: Icon; tintColor: Color } {
  if (state.error) {
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  }
  if (!state.health) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  const ok = state.health.status === "ok";
  return {
    source: ok ? Icon.Circle : Icon.ExclamationMark,
    tintColor: ok ? Color.Green : Color.Red,
  };
}

function statusText(state: MenuBarState): string {
  if (state.error) return "Hermes: Down";
  if (!state.health) return "Hermes: …";
  const ok = state.health.status === "ok";
  const agents = state.health.active_agents ?? 0;
  return ok ? `Hermes${agents > 0 ? ` (${agents})` : ""}` : "Hermes: Unhealthy";
}

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [state, setState] = useState<MenuBarState>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const health = await getHealthDetailed(config);
      setState({ health });
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const icon = statusIcon(state);
  const title = statusText(state);
  const health = state.health;
  const checks = health?.readiness?.checks ?? {};
  const platforms = health?.platforms ?? {};

  return (
    <MenuBarExtra
      icon={
        isLoading
          ? { source: Icon.Circle, tintColor: Color.SecondaryText }
          : icon
      }
      title={isLoading ? "Hermes: …" : title}
      tooltip="Hermes Agent API Server"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item
          title={`Gateway: ${health?.gateway_state ?? "unknown"}`}
          icon={
            health?.gateway_state === "running"
              ? { source: Icon.Checkmark, tintColor: Color.Green }
              : { source: Icon.Xmark, tintColor: Color.Red }
          }
        />
        <MenuBarExtra.Item
          title={`Active agents: ${health?.active_agents ?? 0}`}
          icon={Icon.Bolt}
        />
        <MenuBarExtra.Item
          title={`Version: ${health?.version ?? "unknown"}`}
          icon={Icon.Tag}
        />
      </MenuBarExtra.Section>

      {Object.keys(checks).length > 0 && (
        <MenuBarExtra.Section title="Readiness">
          {Object.entries(checks).map(([name, check]) => {
            const ok = check?.status === "ok";
            return (
              <MenuBarExtra.Item
                key={name}
                title={`${name}: ${check?.status ?? "unknown"}`}
                icon={
                  ok
                    ? { source: Icon.Checkmark, tintColor: Color.Green }
                    : { source: Icon.Xmark, tintColor: Color.Red }
                }
              />
            );
          })}
        </MenuBarExtra.Section>
      )}

      {Object.keys(platforms).length > 0 && (
        <MenuBarExtra.Section title="Platforms">
          {Object.entries(platforms).map(([name, info]) => {
            const connected = info?.state === "connected";
            return (
              <MenuBarExtra.Item
                key={name}
                title={`${name}: ${info?.state ?? "unknown"}`}
                icon={
                  connected
                    ? { source: Icon.Circle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.Red }
                }
              />
            );
          })}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={refresh}
        />
        <MenuBarExtra.Item
          title="Open API Server Status"
          icon={Icon.Window}
          onAction={() => {
            open(`raycast://extensions/${environment.extensionName}/status`);
          }}
        />
      </MenuBarExtra.Section>

      {state.error && (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={state.error.slice(0, 50)}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
