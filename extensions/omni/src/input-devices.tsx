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
import { useCachedPromise } from "@raycast/utils";
import {
  getErrorMessage,
  omni,
  type InputDevice,
  type InputListResponse,
} from "./lib/omni";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    () => omni<InputListResponse>(["input", "list"]),
    [],
    { keepPreviousData: true },
  );

  const devices = data?.devices ?? [];

  async function selectDevice(device: InputDevice) {
    try {
      await omni(["input", "set", device.id]);
      await showHUD(`🎤 ${device.name}`);
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set device",
        message: getErrorMessage(error),
      });
    }
  }

  async function resetToDefault() {
    try {
      await omni(["input", "set", "default"]);
      await showHUD("🎤 Using system default");
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reset device",
        message: getErrorMessage(error),
      });
    }
  }

  const commonActions = (
    <ActionPanel>
      <Action
        title="Use System Default"
        icon={Icon.ArrowCounterClockwise}
        onAction={resetToDefault}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );

  return (
    <List
      navigationTitle="Input Devices"
      searchBarPlaceholder="Search audio devices..."
      isLoading={isLoading}
    >
      {devices.length === 0 ? (
        <List.EmptyView
          icon={Icon.Microphone}
          title="No Input Devices"
          description="Could not find available microphones."
          actions={commonActions}
        />
      ) : (
        devices.map((device) => (
          <List.Item
            key={device.id}
            icon={
              device.isSelected
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Circle
            }
            title={device.name}
            subtitle={device.isDefault ? "System Default" : undefined}
            accessories={[
              ...(device.isSelected
                ? [{ tag: { value: "Active", color: Color.Green } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                {!device.isSelected && (
                  <Action
                    title="Select Device"
                    icon={Icon.Checkmark}
                    onAction={() => selectDevice(device)}
                  />
                )}
                <Action
                  title="Use System Default"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={resetToDefault}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
