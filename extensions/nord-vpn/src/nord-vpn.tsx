import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getNordLynxStatus, getPublicLocation } from "./utils/nordvpn";

type LoadableValue = { status: "loading" } | { status: "ready"; value: string } | { status: "error"; message: string };

function displayAdapterStatus(status: string): string {
  if (status === "Up") return "Connected (NordLynx adapter is up)";
  if (status === "Disconnected") return "Disconnected";
  return `Adapter state: ${status}`;
}

export default function NordVPNStatusCommand() {
  const [adapter, setAdapter] = useState<LoadableValue>({ status: "loading" });
  const [location, setLocation] = useState<LoadableValue>({ status: "loading" });
  const refreshRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequest.current;
    setAdapter({ status: "loading" });
    setLocation({ status: "loading" });

    const [adapterResult, locationResult] = await Promise.allSettled([getNordLynxStatus(), getPublicLocation()]);
    if (requestId !== refreshRequest.current) return;

    setAdapter(
      adapterResult.status === "fulfilled"
        ? { status: "ready", value: displayAdapterStatus(adapterResult.value) }
        : {
            status: "error",
            message:
              adapterResult.reason instanceof Error ? adapterResult.reason.message : String(adapterResult.reason),
          },
    );
    setLocation(
      locationResult.status === "fulfilled"
        ? { status: "ready", value: `${locationResult.value.ip} — ${locationResult.value.country}` }
        : {
            status: "error",
            message:
              locationResult.reason instanceof Error ? locationResult.reason.message : String(locationResult.reason),
          },
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <List isLoading={adapter.status === "loading" || location.status === "loading"}>
      <List.Item
        title="NordLynx adapter"
        subtitle={
          adapter.status === "loading"
            ? "Checking…"
            : adapter.status === "ready"
              ? adapter.value
              : `Error: ${adapter.message}`
        }
        icon={adapter.status === "error" ? Icon.Warning : Icon.Network}
        actions={
          <ActionPanel>
            <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={refresh} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Public IP and country"
        subtitle={
          location.status === "loading"
            ? "Checking…"
            : location.status === "ready"
              ? location.value
              : `Error: ${location.message}`
        }
        icon={location.status === "error" ? Icon.Warning : Icon.Globe}
      />
    </List>
  );
}
