import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { CombinedDriverData, OpenF1Lap, OpenF1Session, OpenF1Meeting } from "./current-session";
// import { getCountryFlag } from "./utils"; // Assuming getCountryFlag might be useful for meeting info
import { useMemo } from "react";

interface DriverLapDetailViewProps {
  driver: CombinedDriverData;
  laps: OpenF1Lap[];
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
}

const formatLapTime = (timeInSeconds: number | null | undefined): string => {
  if (timeInSeconds === null || timeInSeconds === undefined) return "N/A";
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
  }
  return `${seconds.toFixed(3)}s`;
};

const formatSectorTime = (timeInSeconds: number | null | undefined): string => {
  if (timeInSeconds === null || timeInSeconds === undefined) return "N/A";
  return `${timeInSeconds.toFixed(3)}s`;
};

export default function DriverLapDetailView({ driver, laps, sessionInfo, meetingInfo }: DriverLapDetailViewProps) {
  const navTitle = `${driver.name_acronym} - Lap Times${meetingInfo ? ` @ ${meetingInfo.circuit_short_name}` : ""}`;
  const sortedLaps = useMemo(() => [...laps].sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0)), [laps]);

  return (
    <List navigationTitle={navTitle} searchBarPlaceholder="Filter laps...">
      <List.Section title={`Lap Details for ${driver.full_name}`} subtitle={sessionInfo?.session_name}>
        {sortedLaps.length === 0 && (
          <List.EmptyView title="No Lap Data" description="No lap data available for this driver in this session." />
        )}
        {sortedLaps.map((lap) => (
          <List.Item
            key={`lap-${lap.lap_number}-${lap.date_start}`}
            title={`Lap ${lap.lap_number ?? "N/A"}: ${formatLapTime(lap.lap_duration)}`}
            subtitle={lap.is_pit_out_lap ? "Pit Out Lap" : " "}
            accessories={[
              { text: `S1: ${formatSectorTime(lap.duration_sector_1)}` },
              { text: `S2: ${formatSectorTime(lap.duration_sector_2)}` },
              { text: `S3: ${formatSectorTime(lap.duration_sector_3)}` },
              ...(lap.i1_speed ? [{ text: `I1: ${lap.i1_speed}km/h`, icon: Icon.Gauge }] : []),
              ...(lap.i2_speed ? [{ text: `I2: ${lap.i2_speed}km/h`, icon: Icon.Gauge }] : []),
              ...(lap.st_speed ? [{ text: `Trap: ${lap.st_speed}km/h`, icon: Icon.Gauge }] : []),
            ]}
            actions={
              <ActionPanel title={`Lap ${lap.lap_number} - ${driver.name_acronym}`}>
                <Action.CopyToClipboard title="Copy Lap Time" content={formatLapTime(lap.lap_duration)} />
                <Action.CopyToClipboard title="Copy All Lap Info" content={JSON.stringify(lap, null, 2)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
