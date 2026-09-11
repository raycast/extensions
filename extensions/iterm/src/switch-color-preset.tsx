import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { isIt2apiAvailable } from "./core/it2api";
import { getCurrentSessionProfile, getFocusedSessionId, listColorPresets, setColorPreset } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

const IT2API_HINT = "Enable Python API in iTerm2 → Preferences → General → Magic";

const getFrontSessionProfile = (): string => {
  const focusedId = getFocusedSessionId();
  if (!focusedId) return "Default";
  return getCurrentSessionProfile(focusedId);
};

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const it2apiAvailable = isIt2apiAvailable();

  const { presets, profile, it2apiError } = useMemo(() => {
    if (!it2apiAvailable) return { presets: [] as string[], profile: "Default", it2apiError: "it2api not found" };
    try {
      return { presets: listColorPresets(), profile: getFrontSessionProfile(), it2apiError: undefined };
    } catch (e) {
      return { presets: [] as string[], profile: "Default", it2apiError: (e as Error).message };
    }
  }, [it2apiAvailable]);

  const applyPreset = async (preset: string) => {
    try {
      setColorPreset(profile, preset);
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: "Cannot apply preset", message: error.message });
    }
  };

  if (hasPermissionError) return <PermissionErrorScreen />;

  return (
    <List searchBarPlaceholder="Search color presets..." navigationTitle={`Applying to profile: ${profile}`}>
      {it2apiError && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot connect to iTerm2"
          description={`${it2apiError}\n\n${IT2API_HINT}`}
        />
      )}
      {!it2apiError && presets.length === 0 && (
        <List.EmptyView icon={Icon.Brush} title="No presets found" description="No color presets found in iTerm2" />
      )}
      {presets.map((preset) => (
        <List.Item
          key={preset}
          icon={Icon.Brush}
          title={preset}
          actions={
            <ActionPanel>
              <Action title={`Apply to "${profile}"`} icon={Icon.Checkmark} onAction={() => applyPreset(preset)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
