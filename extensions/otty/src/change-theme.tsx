import { Action, ActionPanel, Color, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { changeSetting, loadThemeState, showFailure, type ThemeChoice, type ThemeState } from "./lib/otty";
import { buildConfigSetArgs } from "./lib/settings";
import { LoadFailureView, useRefreshFailureToast } from "./lib/ui";
import type { ThemeMode } from "./lib/themes";

const SLOTS: Record<ThemeMode, { key: string; title: string }> = {
  light: { key: "theme", title: "Light Mode" },
  dark: { key: "theme-dark", title: "Dark Mode" },
};

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
      <Grid.Dropdown.Item title="Light Mode" value="light" icon={Icon.Sun} />
      <Grid.Dropdown.Item title="Dark Mode" value="dark" icon={Icon.Moon} />
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
  // The themes made for this slot come first.
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
        <Grid.Section key={mode} title={mode === "light" ? "Light Themes" : "Dark Themes"}>
          {(data?.themes ?? [])
            .filter((theme) => theme.mode === mode)
            .map((theme) => (
              <ThemeItem
                key={theme.name}
                theme={theme}
                slot={slot}
                isCurrent={theme.name === current}
                state={data}
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
  state,
  onChange,
}: {
  theme: ThemeChoice;
  slot: ThemeMode;
  isCurrent: boolean;
  state?: ThemeState;
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
          <Action
            title={`Use for ${SLOTS[slot].title}`}
            icon={slot === "light" ? Icon.Sun : Icon.Moon}
            onAction={() => applyTheme(theme.name, slot, state, onChange)}
          />
          <Action
            title={`Use for ${SLOTS[other].title}`}
            icon={other === "dark" ? Icon.Moon : Icon.Sun}
            onAction={() => applyTheme(theme.name, other, state, onChange)}
          />
        </ActionPanel>
      }
    />
  );
}

async function applyTheme(name: string, slot: ThemeMode, state: ThemeState | undefined, onChange: () => void) {
  try {
    await changeSetting(buildConfigSetArgs(SLOTS[slot].key, name));
    await showToast({
      style: Toast.Style.Success,
      title: `${SLOTS[slot].title} theme: ${name}`,
      // Without auto switching, Otty only ever shows the light-mode theme.
      message:
        slot === "dark" && state && !state.autoDarkMode
          ? "Turn on auto-theme-dark-mode for Otty to use it."
          : undefined,
    });
    onChange();
  } catch (error) {
    await showFailure("Could not change theme", error);
  }
}
