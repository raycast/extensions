import {
  Action,
  ActionPanel,
  clearSearchBar,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { DEFAULT_CONFIG, TapData, TempoConfig, updateTapData } from "./tempoCalculator";

interface Preferences {
  decimalPlaces: string;
  smoothingFactor: string;
  tempoChangeThreshold: string;
  pauseThreshold: string;
  resetAfterPause: boolean;
}

export default function Command() {
  // Get user preferences
  const preferences = getPreferenceValues<Preferences>();

  // Use preferences or fall back to defaults
  const [config] = useState<TempoConfig>({
    ...DEFAULT_CONFIG,
    decimalPlaces: parseInt(preferences.decimalPlaces) as 0 | 1 | 2,
    smoothingFactor: parseFloat(preferences.smoothingFactor),
    tempoChangeThreshold: parseFloat(preferences.tempoChangeThreshold),
    pauseThreshold: parseInt(preferences.pauseThreshold),
    resetAfterPause: preferences.resetAfterPause,
  });

  const [tapData, setTapData] = useState<TapData>({
    timestamps: [],
    bpm: null,
    rawBpm: null,
    variance: null,
    recentIntervals: [],
    tempoChangeDetected: false,
  });

  const [searchText, setSearchText] = useState("");

  const handleSearchTextChange = useCallback(
    (newText: string) => {
      // Only register a "tap" when a character is added
      if (newText.length > searchText.length) {
        const now = Date.now();

        const newTapData = updateTapData(tapData, now, config);

        setTapData(newTapData);
        clearSearchBar();
      }

      setSearchText(newText);
    },
    [searchText, tapData, config],
  );

  // Get variance indicator based on tapData.variance
  const getConsistencyIndicator = useCallback((variance: number | null) => {
    if (variance === null) return { text: "Consistency: N/A", color: Color.SecondaryText };

    // Lower variance = more consistent
    if (variance < 500) return { text: "Consistency: Excellent", color: Color.Green };
    if (variance < 2000) return { text: "Consistency: Good", color: Color.Blue };
    if (variance < 10000) return { text: "Consistency: Average", color: Color.Yellow };
    return { text: "Consistency: Poor", color: Color.Red };
  }, []);

  const getTitle = useCallback((data: TapData) => {
    if (!data.bpm) return "Tap Tempo";

    if (data.tempoChangeDetected) {
      return `${data.bpm} BPM ↻ New Tempo`;
    }

    return `${data.bpm} BPM`;
  }, []);

  return (
    <List onSearchTextChange={handleSearchTextChange} searchBarPlaceholder="Tap any key to the beat...">
      {tapData.bpm ? (
        <List.Item
          icon={tapData.tempoChangeDetected ? Icon.ArrowClockwise : Icon.Heartbeat}
          title={getTitle(tapData)}
          subtitle={environment.isDevelopment ? `Raw: ${tapData.rawBpm} BPM` : undefined}
          accessories={[
            {
              text: getConsistencyIndicator(tapData.variance).text,
              icon: Icon.Dot,
              tooltip: tapData.variance !== null ? `Variance: ${Math.round(tapData.variance)}` : undefined,
              tag: {
                value: getConsistencyIndicator(tapData.variance).text.split(": ")[1],
                color: tapData.tempoChangeDetected ? Color.Purple : getConsistencyIndicator(tapData.variance).color,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Copy BPM"
                content={`${tapData.bpm}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                icon={Icon.Clipboard}
              />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="Tap Tempo"
          description="Tap any key repeatedly to calculate BPM"
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
