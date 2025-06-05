import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { OpenF1Lap, OpenF1Session, CombinedDriverData } from "./current-session";

interface SessionLapsDetailViewProps {
  allLaps: OpenF1Lap[];
  sessionInfo: OpenF1Session | null;
  drivers: Pick<CombinedDriverData, "driver_number" | "name_acronym" | "full_name" | "team_name" | "team_colour">[];
}

// Helper to format lap/sector times
const formatLapTime = (timeInSeconds: number | null | undefined): string => {
  if (timeInSeconds === null || timeInSeconds === undefined) return "N/A";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = (timeInSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, "0")}`;
};

export default function SessionLapsDetailView({ allLaps, sessionInfo, drivers }: SessionLapsDetailViewProps) {
  const title = sessionInfo ? `All Laps: ${sessionInfo.session_name}` : "All Session Laps";

  if (!allLaps || allLaps.length === 0) {
    return (
      <List navigationTitle={title}>
        <List.EmptyView title="No Lap Data Available" icon={Icon.Gauge} />
      </List>
    );
  }

  // Sort laps: primarily by lap number, then by driver number as a secondary sort for grouping
  const sortedLaps = [...allLaps].sort((a, b) => {
    if (a.lap_number !== b.lap_number) return (a.lap_number || 0) - (b.lap_number || 0);
    return (a.driver_number || 0) - (b.driver_number || 0);
  });

  const getDriverInfo = (driverNumber: number) => {
    return drivers.find((d) => d.driver_number === driverNumber);
  };

  return (
    <List navigationTitle={title} isLoading={sortedLaps.length === 0} isShowingDetail={true}>
      <List.Section title={`All Recorded Laps (Total: ${sortedLaps.length}) - Ordered by Lap No.`}>
        {sortedLaps.map((lap, index) => {
          const driver = getDriverInfo(lap.driver_number);
          const driverName = driver ? driver.full_name : `Car #${lap.driver_number}`;
          const driverAcronym = driver ? `(${driver.name_acronym})` : "";
          const teamColor = driver?.team_colour ? `#${driver.team_colour}` : Color.SecondaryText;

          let lapDetailMarkdown = `## Lap ${lap.lap_number} - ${driverName} ${driverAcronym}\n`;
          lapDetailMarkdown += `* __Lap Time:__ ${formatLapTime(lap.lap_duration)}\n`;
          if (lap.is_pit_out_lap) lapDetailMarkdown += `* __Pit Out Lap__\n`;
          lapDetailMarkdown += `* __Sector 1:__ ${formatLapTime(lap.duration_sector_1)}\n`;
          lapDetailMarkdown += `* __Sector 2:__ ${formatLapTime(lap.duration_sector_2)}\n`;
          lapDetailMarkdown += `* __Sector 3:__ ${formatLapTime(lap.duration_sector_3)}\n`;
          if (lap.st_speed) lapDetailMarkdown += `* __Speed Trap:__ ${lap.st_speed} km/h\n`;
          lapDetailMarkdown += `* __Lap Start Time:__ ${new Date(lap.date_start).toLocaleTimeString()}\n`;

          return (
            <List.Item
              key={`${lap.driver_number}-${lap.lap_number}-${index}`}
              title={`Lap ${lap.lap_number}: ${driverName}`}
              subtitle={driver?.team_name || ""}
              icon={{ source: Icon.Gauge, tintColor: teamColor }}
              accessories={[
                { tag: formatLapTime(lap.lap_duration) },
                ...(lap.is_pit_out_lap ? [{ tag: { value: "PIT OUT", color: Color.Yellow } }] : []),
              ]}
              detail={<List.Item.Detail markdown={lapDetailMarkdown} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Lap Details"
                    content={`Driver: ${driverName}, Lap: ${lap.lap_number}, Time: ${formatLapTime(lap.lap_duration)}, S1: ${formatLapTime(lap.duration_sector_1)}, S2: ${formatLapTime(lap.duration_sector_2)}, S3: ${formatLapTime(lap.duration_sector_3)}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
