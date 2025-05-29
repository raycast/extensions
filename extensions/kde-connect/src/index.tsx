import { ActionPanel, Action, Icon, List, LocalStorage, Form, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import React, { useEffect, useRef, useState } from "react";
import { KDEConnect, KDEDevice } from "./device";
import { SendType, SendTypeAllCases, appExists, startApp } from "./connector";
import { StorageKey } from "./storage";
import GetKDEConnect from "./getKDEConnect";

const connect = new KDEConnect();

export default function Command() {
  const [loading, setLoading] = useState<boolean>(true);
  const appOk = useRef(appExists()).current;
  const [devices, setDevices] = useState<KDEDevice[]>([]);
  const [favouriteDevice, setFavouriteDevice] = useState<string | undefined>();

  const { push } = useNavigation();

  const refreshDevices = async () => {
    setLoading(true);
    try {
      await startApp();
    } catch (error) {
      showFailureToast(error, { title: "Error Starting KDE Connect" });
    }
    const discoveredDevices = await connect.listDevices();
    setDevices(discoveredDevices);
    setLoading(false);
  };

  useEffect(() => {
    if (appOk) {
      LocalStorage.getItem(StorageKey.pairedDevices).then((value) => {
        if (loading && value) {
          const devices = JSON.parse(value as string) as KDEDevice[];
          setDevices(devices);
        }
      });
      LocalStorage.getItem(StorageKey.favouriteDevice).then((value) => {
        if (loading && value) {
          const device = value as string;
          setFavouriteDevice(device);
        }
      });
      refreshDevices();
    }
  }, [appOk]);

  const deviceStatus = (item: KDEDevice): string => {
    return item.paired ? (item.reachable ? "Connected" : "Unreachable") : "Not Paired";
  };

  const deviceStatusIcon = (item: KDEDevice): Icon => {
    return item.paired ? (item.reachable ? Icon.Bolt : Icon.BoltDisabled) : Icon.Link;
  };

  const setFavourite = (device?: KDEDevice) => {
    if (!device) {
      LocalStorage.removeItem(StorageKey.favouriteDevice);
    } else {
      LocalStorage.setItem(StorageKey.favouriteDevice, device.id);
    }
    setFavouriteDevice(device?.id);
  };

  const tryCommand = (command: () => Promise<unknown>) => async () => {
    try {
      await command();
    } catch (error) {
      showFailureToast(error);
    }
  };

  if (appOk === false) {
    return <GetKDEConnect />;
  }

  return (
    <List
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={tryCommand(async () => {
              refreshDevices();
            })}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Paired Devices">
        {devices
          .filter((entry) => entry.paired)
          .map((item) => (
            <List.Item
              key={item.id}
              icon={Icon.Mobile}
              title={item.name}
              subtitle={item.id}
              accessories={(item.id === favouriteDevice ? [{ icon: Icon.Star, text: "Favourite" }] : []).concat([
                { icon: deviceStatusIcon(item), text: deviceStatus(item) },
              ])}
              actions={
                <ActionPanel>
                  <Action
                    title="Send…"
                    icon={Icon.ArrowUpCircleFilled}
                    onAction={() => {
                      connect.deviceID = item.id;
                      push(<DeviceActions device={item} connect={connect} />);
                    }}
                  />
                  {item.id === favouriteDevice ? (
                    <Action
                      title="Unset Favourite"
                      icon={Icon.StarDisabled}
                      onAction={() => {
                        setFavourite(undefined);
                      }}
                    />
                  ) : (
                    <Action
                      title="Set Favourite"
                      icon={Icon.Star}
                      onAction={() => {
                        setFavourite(item);
                      }}
                    />
                  )}
                  <Action
                    title="Ping"
                    icon={Icon.Network}
                    onAction={tryCommand(async () => {
                      await connect.ping(item.id);
                    })}
                  />
                  <Action
                    title="Unpair"
                    icon={Icon.Trash}
                    onAction={tryCommand(async () => {
                      await connect.unpairDevice(item.id);
                      refreshDevices();
                    })}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={tryCommand(async () => {
                      refreshDevices();
                    })}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title="Discovered Devices">
        {devices
          .filter((entry) => !entry.paired)
          .map((item) => (
            <List.Item
              key={item.id}
              icon={Icon.Mobile}
              title={item.name}
              subtitle={item.id}
              accessories={(item.id === favouriteDevice ? [{ icon: Icon.Star, text: "Favourite" }] : []).concat([
                { icon: deviceStatusIcon(item), text: deviceStatus(item) },
              ])}
              actions={
                <ActionPanel>
                  <Action
                    title="Pair Device"
                    icon={Icon.Link}
                    onAction={tryCommand(async () => {
                      setLoading(true);
                      await connect.pairDevice(item.id);
                      refreshDevices();
                      setLoading(false);
                    })}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={tryCommand(async () => {
                      refreshDevices();
                    })}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function DeviceActions(props: { device: KDEDevice; connect: KDEConnect }) {
  const { pop } = useNavigation();
  const [sendType, setSendType] = useState<SendType>(SendType.Text);
  const setSendTypeCast = (string: string) => {
    setSendType(string as SendType);
  };

  interface SendData {
    destination?: string;
    content: string;
  }

  const textField = () => {
    switch (sendType) {
      case SendType.SMS:
        return (
          <React.Fragment>
            <Form.TextField id="destination" title="Phone Number" />
            <Form.TextArea id="content" title="Content" />
          </React.Fragment>
        );

      default:
        return <Form.TextArea id="content" title="Content" />;
    }
  };

  const submitAction = async (values: SendData) => {
    try {
      switch (sendType) {
        case SendType.SMS:
          if (!values.destination) throw new Error("Phone number is required for SMS");
          await props.connect.sendSMS(values.destination, values.content);
          break;

        case SendType.URL:
          await props.connect.share(values.content);
          break;

        default:
          await props.connect.sendText(values.content);
      }
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to send content" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={submitAction} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Content Type" value={sendType} onChange={setSendTypeCast}>
        {SendTypeAllCases.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type} />
        ))}
      </Form.Dropdown>
      {textField()}
    </Form>
  );
}
