import { List, ActionPanel, Action, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { parseInput, convertTemperature, TEMPERATURE_UNITS, TemperatureUnit } from "./utils/convert";

interface Preferences {
  defaultUnit: TemperatureUnit;
}

// Icon mapping for each temperature unit
const UNIT_ICONS: Record<TemperatureUnit, string> = {
  celsius: "🌡️",
  fahrenheit: "🇺🇸",
  kelvin: "🔬",
  rankine: "⚗️",
  reaumur: "📜",
};

// Get contextual description for temperature ranges
function getTemperatureContext(celsius: number): string {
  if (celsius < -273.15) return "Below absolute zero (impossible)";
  if (celsius === -273.15) return "Absolute zero";
  if (celsius < -100) return "Extremely cold";
  if (celsius < 0) return "Below freezing";
  if (celsius === 0) return "Water freezing point";
  if (celsius < 20) return "Cool";
  if (celsius < 30) return "Room temperature";
  if (celsius < 40) return "Warm";
  if (celsius < 100) return "Hot";
  if (celsius === 100) return "Water boiling point";
  return "Very hot";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [fromUnit, setFromUnit] = useState<TemperatureUnit>(preferences.defaultUnit || "celsius");

  const value = parseInput(searchText);
  const results = value !== null ? convertTemperature(value, fromUnit) : [];

  const currentUnit = TEMPERATURE_UNITS[fromUnit];

  // Calculate celsius value for context
  let celsiusValue: number | null = null;
  if (value !== null) {
    const celsiusResult = results.find((r) => r.unit === "Celsius");
    celsiusValue = celsiusResult?.value ?? value;
    if (fromUnit === "celsius") celsiusValue = value;
  }

  return (
    <List
      searchBarPlaceholder={`Enter temperature value (e.g., 25, -10, 36.6)`}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Convert from unit"
          value={fromUnit}
          onChange={(newValue) => setFromUnit(newValue as TemperatureUnit)}
        >
          {(Object.keys(TEMPERATURE_UNITS) as TemperatureUnit[]).map((unit) => (
            <List.Dropdown.Item key={unit} title={`${UNIT_ICONS[unit]} ${TEMPERATURE_UNITS[unit].name}`} value={unit} />
          ))}
        </List.Dropdown>
      }
    >
      {value !== null ? (
        <>
          <List.Section
            title={`${value} ${currentUnit.symbol}`}
            subtitle={celsiusValue !== null ? getTemperatureContext(celsiusValue) : undefined}
          >
            {results.map((result) => {
              // Determine icon color based on temperature scale
              const getIconColor = () => {
                if (result.unit === "Kelvin" && result.value < 273.15) return Color.Blue;
                if (result.unit === "Celsius" && result.value < 0) return Color.Blue;
                if (result.unit === "Fahrenheit" && result.value < 32) return Color.Blue;
                if (result.unit === "Celsius" && result.value > 30) return Color.Orange;
                if (result.unit === "Fahrenheit" && result.value > 86) return Color.Orange;
                return Color.SecondaryText;
              };

              return (
                <List.Item
                  key={result.unit}
                  icon={{ source: Icon.Temperature, tintColor: getIconColor() }}
                  title={result.formatted}
                  subtitle={result.unit}
                  accessories={[
                    { text: result.symbol, tooltip: `Symbol: ${result.symbol}` },
                    { text: `${result.value.toFixed(4)}`, tooltip: "Precise value" },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Copy">
                        <Action.CopyToClipboard
                          title="Copy Formatted Value"
                          content={result.formatted}
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Number Only"
                          content={result.value.toFixed(2)}
                          icon={Icon.Number00}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Precise Value"
                          content={result.value.toFixed(6)}
                          icon={Icon.Circle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Convert">
                        <Action
                          title={`Set Source to ${result.unit}`}
                          icon={Icon.Switch}
                          shortcut={{ modifiers: ["cmd"], key: "s" }}
                          onAction={() => {
                            const newUnit = Object.keys(TEMPERATURE_UNITS).find(
                              (k) => TEMPERATURE_UNITS[k as TemperatureUnit].name === result.unit,
                            ) as TemperatureUnit;
                            if (newUnit) {
                              setFromUnit(newUnit);
                            }
                          }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Temperature, tintColor: Color.SecondaryText }}
          title={`Enter a temperature in ${currentUnit.name}`}
          description={`Examples: 25 (room temp), 0 (freezing), 100 (boiling), -273.15 (absolute zero)`}
        />
      )}
    </List>
  );
}
