import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { loadThemeState, type ThemeChoice } from "./lib/otty-config";
import { applyTheme, THEME_SLOT_TITLES } from "./lib/theme-change";
import { type ThemeMode } from "./lib/themes";
import { LoadFailureView, useRefreshFailureToast } from "./lib/ui";

const SLOTS: Record<ThemeMode, { title: string; icon: Icon; sectionTitle: string }> = {
  light: { title: THEME_SLOT_TITLES.light, icon: Icon.Sun, sectionTitle: "Light Themes" },
  dark: { title: THEME_SLOT_TITLES.dark, icon: Icon.Moon, sectionTitle: "Dark Themes" },
};
const MODES: ThemeMode[] = ["light", "dark"];

export default function Command() {
  const [slot, setSlot] = useState<ThemeMode>("light");
  const { data, isLoading, error, revalidate } = useCachedPromise(loadThemeState, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  useRefreshFailureToast(error, Boolean(data), "Could not refresh Otty themes");

  const dropdown = (
    <Grid.Dropdown
      id="theme-slot"
      tooltip="Theme For"
      storeValue
      onChange={(value) => setSlot(value === "dark" ? "dark" : "light")}
    >
      {MODES.map((mode) => (
        <Grid.Dropdown.Item key={mode} title={SLOTS[mode].title} value={mode} icon={SLOTS[mode].icon} />
      ))}
    </Grid.Dropdown>
  );

  if (error && !data) {
    return (
      <Grid searchBarAccessory={dropdown}>
        <LoadFailureView title="Could Not Read Otty Themes" error={error} onRetry={revalidate} grid />
      </Grid>
    );
  }

  const current = data ? data[slot] : undefined;
  const order: ThemeMode[] = slot === "light" ? ["light", "dark"] : ["dark", "light"];

  return (
    <Grid
      columns={4}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarPlaceholder={`Search themes for ${SLOTS[slot].title.toLowerCase()}`}
      searchBarAccessory={dropdown}
    >
      <Grid.EmptyView
        icon={Icon.Brush}
        title="No Matching Themes"
        description="Try another name, such as Paper or Nord."
      />
      {order.map((mode) => (
        <Grid.Section key={mode} title={SLOTS[mode].sectionTitle}>
          {(data?.themes ?? [])
            .filter((theme) => theme.mode === mode)
            .map((theme) => (
              <ThemeItem
                key={theme.name}
                theme={theme}
                slot={slot}
                isCurrent={theme.name === current}
                autoDarkMode={data?.autoDarkMode}
                onChange={revalidate}
              />
            ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function ThemeItem({
  theme,
  slot,
  isCurrent,
  autoDarkMode,
  onChange,
}: {
  theme: ThemeChoice;
  slot: ThemeMode;
  isCurrent: boolean;
  autoDarkMode?: boolean;
  onChange: () => void;
}) {
  const other: ThemeMode = slot === "light" ? "dark" : "light";
  return (
    <Grid.Item
      title={theme.name}
      subtitle={isCurrent ? "Current" : undefined}
      content={
        theme.previewPath ? { source: theme.previewPath } : { source: Icon.Brush, tintColor: Color.SecondaryText }
      }
      accessory={
        isCurrent
          ? {
              icon: { source: Icon.CheckCircle, tintColor: Color.Green },
              tooltip: `Current ${SLOTS[slot].title.toLowerCase()} theme`,
            }
          : undefined
      }
      actions={
        <ActionPanel>
          {[slot, other].map((mode) => (
            <Action
              key={mode}
              title={`Use for ${SLOTS[mode].title}`}
              icon={SLOTS[mode].icon}
              onAction={() => applyTheme(theme.name, mode, onChange, autoDarkMode)}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
