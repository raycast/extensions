import { List, ActionPanel, Action, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { parseInput, convertTemperature, TEMPERATURE_UNITS, TemperatureUnit, toCelsius } from "./utils/convert";

const UNIT_ICONS: Record<TemperatureUnit, string> = {
  celsius: "🌡️",
  fahrenheit: "🇺🇸",
  kelvin: "🔬",
  rankine: "⚗️",
  reaumur: "📜",
};

const getTemperatureContext = (celsius: number): string => {
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
};

const getTemperatureColor = (unit: string, value: number): Color => {
  if (unit === "Kelvin" && value < 273.15) return Color.Blue;
  if (unit === "Celsius" && value < 0) return Color.Blue;
  if (unit === "Fahrenheit" && value < 32) return Color.Blue;
  if (unit === "Celsius" && value > 30) return Color.Orange;
  if (unit === "Fahrenheit" && value > 86) return Color.Orange;
  return Color.SecondaryText;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Convert>();
  const [searchText, setSearchText] = useState("");
  const [fromUnit, setFromUnit] = useState<TemperatureUnit>(preferences.defaultUnit || "celsius");

  const value = parseInput(searchText);
  const results = value !== null ? convertTemperature(value, fromUnit) : [];

  const currentUnit = TEMPERATURE_UNITS[fromUnit];
  const celsiusValue = value !== null ? toCelsius(value, fromUnit) : null;

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
              return (
                <List.Item
                  key={result.key}
                  icon={{ source: Icon.Temperature, tintColor: getTemperatureColor(result.name, result.value) }}
                  title={result.formatted}
                  subtitle={result.name}
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
                          title={`Set Source to ${result.name}`}
                          icon={Icon.Switch}
                          shortcut={{ modifiers: ["cmd"], key: "s" }}
                          onAction={() => {
                            setFromUnit(result.key);
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
