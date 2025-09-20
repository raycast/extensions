import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
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

interface ApiResponse {
  NACK_Incidents: Incident[];
  ACK_Incidents: Incident[];
}

interface CombinedData {
  incidents: ApiResponse;
  activeOncall: { oncallData: ActiveOncall };
}

const truncate = (str: string, n: number) => (str && str.length > n ? str.substring(0, n - 1) + "..." : str);

export default function Command() {
  const fetchData = async (): Promise<CombinedData> => {
    const [incidents, oncall] = await Promise.all([api.incidents.getOpenIncidents(1, 20), api.oncall.amIOncall()]);

    return {
      incidents,
      activeOncall: oncall,
    };
  };

  const { data, isLoading } = useCachedPromise(fetchData, [], {
    onError: (error) => {
      console.error("Error fetching data:", error);
    },
    // Refetch data every 30 seconds
    execute: true,
    keepPreviousData: true,
    initialData: {
      incidents: {
        NACK_Incidents: [] as Incident[],
        ACK_Incidents: [] as Incident[],
      },
      activeOncall: {
        oncallData: {
          isCurrentlyOncall: false,
        },
      },
    },
  });

  const incidents = useMemo(() => {
    if (!data) return { triggered: [], acknowledged: [] };

    const allIncidents = [...data.incidents.NACK_Incidents, ...data.incidents.ACK_Incidents];

    return {
      triggered: allIncidents.filter((i) => i.status === "NACK"),
      acknowledged: allIncidents.filter((i) => i.status === "ACK"),
    };
  }, [data]);

  const isOnCall = data?.activeOncall.oncallData.isCurrentlyOncall;

  return (
    <MenuBarExtra isLoading={isLoading} icon="spike-logo-white.png" tooltip="Open incidents">
      <MenuBarExtra.Item
        icon={{
          source: Icon.Dot,
          tintColor: isOnCall ? Color.Green : Color.SecondaryText,
        }}
        title={isOnCall ? "You are on-call" : "You are not on-call"}
        onAction={() => {
          open(`${config?.spike}/on-calls?includes=me`);
        }}
      />

      <MenuBarExtra.Section title={`Triggered (${incidents.triggered.length})`}>
        {incidents.triggered.map((incident) => (
          <MenuBarExtra.Item
            key={incident.counterId}
            title={
              `[${incident.counterId}] ${truncate(incident.message, 35)}` || `[${incident.counterId}] Parsing failed`
            }
            onAction={() => {
              open(`${config?.spike}/incidents/${incident.counterId}`);
            }}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={`Acknowledged (${incidents.acknowledged.length})`}>
        {incidents.acknowledged.map((incident) => (
          <MenuBarExtra.Item
            key={incident.counterId}
            title={
              `[${incident.counterId}] ${truncate(incident.message, 35)}` || `[${incident.counterId}] Parsing failed`
            }
            onAction={() => {
              open(`${config?.spike}/incidents/${incident.counterId}`);
            }}
          />
        ))}
      </MenuBarExtra.Section>

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
