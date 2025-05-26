import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { CombinedDriverData, OpenF1Stint, OpenF1Session, OpenF1Meeting } from "./current-session";
import { useMemo } from "react";

interface DriverStintDetailViewProps {
  driver: CombinedDriverData;
  stints: OpenF1Stint[];
  sessionInfo: OpenF1Session | null;
  meetingInfo: OpenF1Meeting | null;
}

const getTyreColor = (compound: string | null): Color => {
  switch (compound?.toUpperCase()) {
    case "SOFT":
      return Color.Red;
    case "MEDIUM":
      return Color.Yellow;
    case "HARD":
      return Color.PrimaryText;
    case "INTERMEDIATE":
      return Color.Green;
    case "WET":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
};

export default function DriverStintDetailView({
  driver,
  stints,
  sessionInfo,
  meetingInfo,
}: DriverStintDetailViewProps) {
  const navTitle = `${driver.name_acronym} - Tyre Stints${meetingInfo ? ` @ ${meetingInfo.circuit_short_name}` : ""}`;
  const sortedStints = useMemo(
    () => [...stints].sort((a, b) => (a.stint_number || 0) - (b.stint_number || 0)),
    [stints],
  );

  return (
    <List navigationTitle={navTitle} searchBarPlaceholder="Filter stints...">
      <List.Section title={`Tyre Stint Details for ${driver.full_name}`} subtitle={sessionInfo?.session_name}>
        {sortedStints.length === 0 && (
          <List.EmptyView
            title="No Stint Data"
            description="No tyre stint data available for this driver in this session."
          />
        )}
        {sortedStints.map((stint) => (
          <List.Item
            key={`stint-${stint.stint_number}-${stint.lap_start}`}
            icon={Icon.Layers}
            title={`Stint ${stint.stint_number}: ${stint.compound ?? "Unknown Compound"}`}
            subtitle={`Laps: ${stint.lap_start} - ${stint.lap_end ?? "Current"}`}
            accessories={[
              { tag: { value: stint.compound ?? "Unknown", color: getTyreColor(stint.compound) } },
              { text: `Start Age: ${stint.tyre_age_at_start ?? "?"} Laps` },
            ]}
            actions={
              <ActionPanel title={`Stint ${stint.stint_number} - ${driver.name_acronym}`}>
                <Action.CopyToClipboard title="Copy Stint Compound" content={stint.compound ?? "N/A"} />
                <Action.CopyToClipboard title="Copy All Stint Info" content={JSON.stringify(stint, null, 2)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
