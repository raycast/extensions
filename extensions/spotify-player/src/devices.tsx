import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useMyDevices } from "./hooks/useMyDevices";
import { View } from "./components/View";
import { getErrorMessage } from "./helpers/getError";
import { transferMyPlayback } from "./api/transferMyPlayback";

function Devices() {
  const { myDevicesData, myDevicesError, myDevicesIsLoading, myDevicesRevalidate } = useMyDevices();
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  if (myDevicesError) {
    <List isLoading={myDevicesIsLoading}>
      <List.EmptyView
        title="Unable to load devices"
        description={getErrorMessage(myDevicesError)}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Repeat}
              title="Refresh"
              onAction={async () => {
                myDevicesRevalidate();
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    </List>;
  }

  if (!Array.isArray(myDevicesData?.devices)) {
    return (
      <List isLoading={myDevicesIsLoading}>
        <List.EmptyView
          title="No devices found"
          description="You don't have any devices connected to your account."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => {
                  myDevicesRevalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={myDevicesIsLoading}>
      {myDevicesData.devices.map((device) => (
        <List.Item
          key={device.id}
          title={device.name ?? "Unknown"}
          subtitle={device.type}
          icon={device.is_active ? Icon.SpeakerOn : { source: Icon.SpeakerOff, tintColor: Color.SecondaryText }}
          accessories={[{ text: device.is_active ? "Active" : null }]}
          actions={
            <ActionPanel>
              {!device.is_active ? (
                <Action
                  icon={Icon.SpeakerOn}
                  title={`Connect to ${device.name}`}
                  onAction={async () => {
                    try {
                      if (device.id) {
                        await transferMyPlayback(device.id);
                        setTimeout(() => {
                          myDevicesRevalidate();
                        }, 500);
                      }
                      if (closeWindowOnAction) {
                        await showHUD(`Connected to ${device.name}`);
                        await popToRoot();
                        return;
                      }
                      await showToast({ title: `Connected to ${device.name}` });
                    } catch (err) {
                      const error = getErrorMessage(err);
                      if (closeWindowOnAction) {
                        await showHUD(error);
                        await popToRoot();
                        return;
                      }
                      await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error });
                    }
                  }}
                />
              ) : null}
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => {
                  myDevicesRevalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Devices />
    </View>
  );
}
