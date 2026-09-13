import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  failureMessage,
  MENU_BAR_MODES,
  MenuBarMode,
  readMenuBarStatus,
  refreshToggleCommandSubtitle,
  setMenuBarMode,
  updateCommandSubtitle,
} from "./menu-bar";

const MODE_ICONS: Record<MenuBarMode, Icon> = {
  always: Icon.EyeDisabled,
  "desktop-only": Icon.Desktop,
  "fullscreen-only": Icon.AppWindow,
  never: Icon.Eye,
};

function ModePicker() {
  const [currentMode, setCurrentMode] = useState<MenuBarMode>();
  const [selectedMode, setSelectedMode] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentMode() {
      try {
        const status = await readMenuBarStatus();
        if (cancelled) return;

        setCurrentMode(status.mode);
        setSelectedMode(status.mode);
        await updateCommandSubtitle("BarShift");
      } catch (error) {
        if (cancelled) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn’t read the current menu bar mode",
          message: failureMessage(error),
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCurrentMode();
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyMode(mode: MenuBarMode) {
    const definition = MENU_BAR_MODES.find(
      (candidate) => candidate.value === mode,
    );
    if (!definition || isApplying) return;

    if (mode === currentMode) {
      await refreshToggleCommandSubtitle();
      await showToast({
        style: Toast.Style.Success,
        title: "Already active",
        message: definition.label,
      });
      return;
    }

    setIsApplying(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting ${definition.label}`,
    });

    try {
      const status = await setMenuBarMode(mode);
      setCurrentMode(status.mode);
      setSelectedMode(status.mode);
      await refreshToggleCommandSubtitle();

      toast.style = Toast.Style.Success;
      toast.title = "Menu bar mode updated";
      toast.message = status.label;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn’t change menu bar auto-hide";
      toast.message = failureMessage(error);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <List
      isLoading={isLoading || isApplying}
      searchBarPlaceholder="Choose a menu bar mode…"
      selectedItemId={selectedMode}
      onSelectionChange={(mode) => setSelectedMode(mode ?? undefined)}
    >
      <List.Section title="Automatically hide and show the menu bar">
        {MENU_BAR_MODES.map((mode) => {
          const isCurrent = mode.value === currentMode;
          return (
            <List.Item
              key={mode.value}
              id={mode.value}
              title={mode.label}
              subtitle={mode.description}
              icon={{
                source: MODE_ICONS[mode.value],
                tintColor: isCurrent ? Color.Green : Color.SecondaryText,
              }}
              accessories={
                isCurrent
                  ? [{ tag: { value: "Current", color: Color.Green } }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`Set ${mode.label}`}
                    icon={Icon.CheckCircle}
                    onAction={() => applyMode(mode.value)}
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

export default function Command() {
  return <ModePicker />;
}
