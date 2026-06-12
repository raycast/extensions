import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getLidSleepState, setLidSleepState, LidSleepState } from "./utils";

export default function Command() {
  const [state, setState] = useState<LidSleepState>({ supported: false });
  const [isLoading, setIsLoading] = useState(true);

  async function loadState() {
    setIsLoading(true);
    try {
      const s = await getLidSleepState();
      setState(s);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load lid settings",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadState();
  }, []);

  async function handleToggleAC() {
    if (!state.supported) return;
    setIsLoading(true);
    try {
      const newAc = !state.acSleepDisabled;
      await setLidSleepState(newAc, !!state.dcSleepDisabled);
      await showHUD(
        newAc
          ? "Lid sleep disabled on AC power"
          : "Lid sleep enabled on AC power",
      );
      await loadState();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  async function handleToggleDC() {
    if (!state.supported) return;
    setIsLoading(true);
    try {
      const newDc = !state.dcSleepDisabled;
      await setLidSleepState(!!state.acSleepDisabled, newDc);
      await showHUD(
        newDc
          ? "Lid sleep disabled on battery"
          : "Lid sleep enabled on battery",
      );
      await loadState();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  async function handleDisableBoth() {
    if (!state.supported) return;
    setIsLoading(true);
    try {
      await setLidSleepState(true, true);
      await showHUD("Lid sleep disabled for all power sources");
      await loadState();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  async function handleEnableBoth() {
    if (!state.supported) return;
    setIsLoading(true);
    try {
      await setLidSleepState(false, false);
      await showHUD("Lid sleep enabled for all power sources");
      await loadState();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  if (!isLoading && !state.supported) {
    return (
      <List>
        <List.EmptyView
          title="Lid Settings Unsupported"
          description="Lid close power settings are only available on laptops. Desktops do not support this feature."
          icon={Icon.Warning}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Manage lid sleep action..."
    >
      <List.Section title="Lid Close Actions">
        <List.Item
          title="Plugged In (AC Power)"
          subtitle="Action taken when closing lid while plugged in"
          icon={Icon.Plug}
          accessories={[
            {
              tag: {
                value: state.acSleepDisabled ? "Do Nothing" : "Sleep",
                color: state.acSleepDisabled
                  ? Color.Green
                  : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={
                  state.acSleepDisabled
                    ? "Enable Sleep on Lid Close"
                    : "Disable Sleep on Lid Close"
                }
                onAction={handleToggleAC}
                icon={state.acSleepDisabled ? Icon.Checkmark : Icon.Xmark}
              />
              <Action
                title="Disable Sleep on Both"
                onAction={handleDisableBoth}
                icon={Icon.Lock}
              />
              <Action
                title="Enable Sleep on Both"
                onAction={handleEnableBoth}
                icon={Icon.LockUnlocked}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="On Battery (DC Power)"
          subtitle="Action taken when closing lid while on battery"
          icon={Icon.Battery}
          accessories={[
            {
              tag: {
                value: state.dcSleepDisabled ? "Do Nothing" : "Sleep",
                color: state.dcSleepDisabled
                  ? Color.Green
                  : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={
                  state.dcSleepDisabled
                    ? "Enable Sleep on Lid Close"
                    : "Disable Sleep on Lid Close"
                }
                onAction={handleToggleDC}
                icon={state.dcSleepDisabled ? Icon.Checkmark : Icon.Xmark}
              />
              <Action
                title="Disable Sleep on Both"
                onAction={handleDisableBoth}
                icon={Icon.Lock}
              />
              <Action
                title="Enable Sleep on Both"
                onAction={handleEnableBoth}
                icon={Icon.LockUnlocked}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
