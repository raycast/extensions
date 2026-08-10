import { Detail, Color, Icon, getPreferenceValues } from "@raycast/api";
import { GlucoseEntry } from "../types";
import {
  calculateGlucoseStats,
  formatGlucoseValue,
  getDirectionArrow,
  getDirectionDisplay,
  getGlucoseLevel,
  isRecentReading,
} from "../utils/glucoseStats";
import { useServerUnits, useCurrentProfileTargets, useTreatmentData } from "../hooks";

interface GlucoseStatsMetadataProps {
  readings: GlucoseEntry[];
}

export function GlucoseStatsMetadata({ readings }: GlucoseStatsMetadataProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { units } = useServerUnits();
  const { treatments } = useTreatmentData();
  const { targets } = useCurrentProfileTargets(treatments || []);
  const useMmol = units === "mmol";

  const targetLow = targets?.low || 70;
  const targetHigh = targets?.high || 180;

  const stats = calculateGlucoseStats(readings, targetLow, targetHigh);

  const instanceUrl = new URL(preferences.instance);
  instanceUrl.pathname = "/";

  if (!stats.current) {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Status" text="No glucose data available" icon={Icon.ExclamationMark} />
      </Detail.Metadata>
    );
  }

  const currentLevel = getGlucoseLevel(stats.current.sgv, targetLow, targetHigh);
  const isRecent = isRecentReading(stats.current);

  const getCurrentLevelColor = () => {
    if (!isRecent) return Color.Orange;
    switch (currentLevel) {
      case "low":
      case "high":
        return Color.Red;
      default:
        return Color.Green;
    }
  };

  const getCurrentLevelIcon = () => {
    if (!isRecent) return { source: Icon.Exclamationmark2, tintColor: Color.Orange };
    switch (currentLevel) {
      case "low":
        return { source: Icon.ArrowDown, tintColor: Color.Red };
      case "high":
        return { source: Icon.ArrowUp, tintColor: Color.Yellow };
      default:
        return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
  };

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Current Reading"
        text={`${formatGlucoseValue(stats.current.sgv, useMmol)} ${getDirectionArrow(stats.direction || "UNKNOWN")}`}
        icon={getCurrentLevelIcon()}
      />
      <Detail.Metadata.TagList title="Trend & Level">
        <Detail.Metadata.TagList.Item text={getDirectionDisplay(stats)} color={getCurrentLevelColor()} />
        <Detail.Metadata.TagList.Item
          text={currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
          color={getCurrentLevelColor()}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Status" text={isRecent ? "Recent reading" : "Stale reading"} />
      <Detail.Metadata.Label
        title="Last Updated"
        text={stats.lastUpdated?.toLocaleTimeString() || "Unknown time"}
        icon={Icon.Clock}
      />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="Target Range"
        text={`${formatGlucoseValue(targetLow, useMmol)} - ${formatGlucoseValue(targetHigh, useMmol)}`}
        icon={Icon.BullsEye}
      />
      {targets && (
        <Detail.Metadata.Label
          title="Active Profile"
          text={`${targets.profileName}${targets.isDefault ? " (default)" : ""}`}
          icon={Icon.PersonLines}
        />
      )}

      <Detail.Metadata.Separator />

      {stats.devices.length > 0 ? (
        <Detail.Metadata.TagList title="Devices">
          {stats.devices.map((device) => (
            <Detail.Metadata.TagList.Item key={device} text={device} color={Color.Blue} />
          ))}
        </Detail.Metadata.TagList>
      ) : (
        <Detail.Metadata.Label title="Devices" text={{ value: "No sources logged", color: Color.SecondaryText }} />
      )}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title="24-hour Trends"
        text={`${stats.readingsCount.toString()} records`}
        icon={Icon.Document}
      />

      <Detail.Metadata.Label
        title="Average"
        text={stats.average ? formatGlucoseValue(stats.average, useMmol) : "N/A"}
        icon={Icon.BarChart}
      />
      <Detail.Metadata.Label
        title="Minimum"
        text={stats.min ? formatGlucoseValue(stats.min, useMmol) : "N/A"}
        icon={Icon.ArrowDown}
      />
      <Detail.Metadata.Label
        title="Maximum"
        text={stats.max ? formatGlucoseValue(stats.max, useMmol) : "N/A"}
        icon={Icon.ArrowUp}
      />

      <Detail.Metadata.Label
        title="High"
        text={{ value: `${stats.timeInRange.high.toFixed(1)}%`, color: Color.Yellow }}
      />
      <Detail.Metadata.Label
        title="In Range"
        text={{ value: `${stats.timeInRange.target.toFixed(1)}%`, color: Color.Green }}
      />
      <Detail.Metadata.Label title="Low" text={{ value: `${stats.timeInRange.low.toFixed(1)}%`, color: Color.Red }} />

      <Detail.Metadata.Separator />

      {preferences.instance && (
        <Detail.Metadata.Link
          title="Open Nightscout Instance"
          text={instanceUrl.hostname}
          target={instanceUrl.toString()}
        />
      )}
    </Detail.Metadata>
  );
}
