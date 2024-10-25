import { MenuBarExtra, open } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "./api";
import config from "./config";

interface Incident {
  counterId: string;
  message: string;
  status: "NACK" | "ACK" | "RES";
}

interface ActiveOncall {
  isCurrentlyOncall: boolean;
}

export default function Command() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeOncall, setActiveOncall] = useState<ActiveOncall | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.incidents.getOpenIncidents(1, 20);
      const oncall = await api.oncall.amIOncall();
      setActiveOncall(oncall.oncallData);

      // activeOncall && activeOncall.isCurrentlyOncall
      setIncidents([...response.NACK_Incidents, ...response.ACK_Incidents]);
    } catch (err) {
      console.error("Error fetching incidents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const triggeredIncidents = useMemo(() => incidents.filter((i) => i.status === "NACK"), [incidents]);
  const acknowledgedIncidents = useMemo(() => incidents.filter((i) => i.status === "ACK"), [incidents]);

  const truncate = (str: string, n: number) => (str && str.length > n ? str.substring(0, n - 1) + "..." : str);

  return (
    <MenuBarExtra isLoading={isLoading} icon={"spike-logo-white.png"} tooltip="Open incidents">
      <MenuBarExtra.Item
        icon={{
          source: activeOncall && activeOncall.isCurrentlyOncall ? "green-dot.png" : "gray-dot.png",
        }}
        title={activeOncall && activeOncall.isCurrentlyOncall ? "You are on-call" : "You are not on-call"}
        onAction={() => {
          open(`${config?.spike}/on-calls?includes=me`);
        }}
      />
      <MenuBarExtra.Section title={`Triggered (${triggeredIncidents.length})`}>
        {triggeredIncidents.map((incident, index) => (
          <MenuBarExtra.Item
            key={index}
            title={
              `[${incident.counterId}] ${truncate(incident.message, 35)}` || `[${incident.counterId}] Parsing failed`
            }
            onAction={() => {
              open(`${config?.spike}/incidents/${incident.counterId}`);
            }}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title={`Acknowledged (${acknowledgedIncidents.length})`} />
      {acknowledgedIncidents.map((incident, index) => (
        <MenuBarExtra.Item
          key={index}
          title={
            `[${incident.counterId}] ${truncate(incident.message, 35)}` || `[${incident.counterId}] Parsing failed`
          }
          onAction={() => {
            open(`${config?.spike}/incidents/${incident.counterId}`);
          }}
        />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={{
            source: "spike-logo-black.png",
          }}
          title="Open Dashboard"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => {
            open(`${config?.spike}`);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
