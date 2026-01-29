import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  ColorFilterType,
  filterNames,
  setColorFilterType,
  disableColorFilters,
  getColorFilterStatus,
} from "./color-filters";

interface FilterItem {
  type: ColorFilterType;
  name: string;
  description: string;
  icon: Icon;
  color: Color;
}

const filters: FilterItem[] = [
  {
    type: ColorFilterType.Grayscale,
    name: filterNames[ColorFilterType.Grayscale],
    description: "Removes all color, showing only shades of gray",
    icon: Icon.Circle,
    color: Color.SecondaryText,
  },
  {
    type: ColorFilterType.Protanopia,
    name: filterNames[ColorFilterType.Protanopia],
    description: "Helps with red-green color blindness (difficulty seeing red)",
    icon: Icon.EyeDropper,
    color: Color.Red,
  },
  {
    type: ColorFilterType.Deuteranopia,
    name: filterNames[ColorFilterType.Deuteranopia],
    description:
      "Helps with red-green color blindness (difficulty seeing green)",
    icon: Icon.EyeDropper,
    color: Color.Green,
  },
  {
    type: ColorFilterType.Tritanopia,
    name: filterNames[ColorFilterType.Tritanopia],
    description: "Helps with blue-yellow color blindness",
    icon: Icon.EyeDropper,
    color: Color.Blue,
  },
  {
    type: ColorFilterType.ColorTint,
    name: filterNames[ColorFilterType.ColorTint],
    description: "Applies a color tint overlay to the screen",
    icon: Icon.Brush,
    color: Color.Orange,
  },
];

export default function Command() {
  const [currentStatus, setCurrentStatus] = useState<{
    enabled: boolean;
    filterType: ColorFilterType;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const status = await getColorFilterStatus();
      setCurrentStatus(status);
      setIsLoading(false);
    }
    fetchStatus();
  }, []);

  async function handleSelectFilter(filterType: ColorFilterType) {
    await setColorFilterType(filterType);
    setCurrentStatus({ enabled: true, filterType });
  }

  async function handleDisable() {
    await disableColorFilters();
    setCurrentStatus({
      enabled: false,
      filterType: currentStatus?.filterType ?? ColorFilterType.Grayscale,
    });
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Color Filters">
        {filters.map((filter) => {
          const isActive =
            currentStatus?.enabled && currentStatus?.filterType === filter.type;
          return (
            <List.Item
              key={filter.type}
              icon={{ source: filter.icon, tintColor: filter.color }}
              title={filter.name}
              subtitle={filter.description}
              accessories={[
                isActive
                  ? { icon: Icon.Checkmark, tooltip: "Currently Active" }
                  : {},
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Enable ${filter.name}`}
                    icon={Icon.Eye}
                    onAction={() => handleSelectFilter(filter.type)}
                  />
                  {currentStatus?.enabled && (
                    <Action
                      title="Disable Color Filters"
                      icon={Icon.EyeDisabled}
                      onAction={handleDisable}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {currentStatus?.enabled && (
        <List.Section title="Quick Actions">
          <List.Item
            icon={{ source: Icon.EyeDisabled, tintColor: Color.Red }}
            title="Disable Color Filters"
            subtitle="Turn off all color filters"
            actions={
              <ActionPanel>
                <Action
                  title="Disable"
                  icon={Icon.EyeDisabled}
                  onAction={handleDisable}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
