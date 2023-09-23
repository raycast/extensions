import { Form, ActionPanel, Action, showToast, Toast, List, useNavigation } from "@raycast/api";
import { Devices } from "./bootedDevices";
import { useState } from "react";
import { getAppContainer } from "./util";
import { Device } from "./types";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { showBundleIdEmptyToast, showCouldntLoadDeviceToast } from "./toasts";

type Values = {
  bundleId: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Device | undefined>();
  const { push } = useNavigation();

  async function handleSubmit(values: Values) {
    try {
      if (!chosenDevice) {
        await showCouldntLoadDeviceToast();
        return;
      }

      if (values.bundleId.trim().length === 0) {
        await showBundleIdEmptyToast();
        return;
      }

      const appResponse = await getAppContainer(chosenDevice.udid, values.bundleId, "app");
      const groupResponse = await getAppContainer(chosenDevice.udid, values.bundleId, "groups");
      const dataResponse = await getAppContainer(chosenDevice.udid, values.bundleId, "data");

      const responses: ContainerResponse[] = [];

      if (appResponse.trim().length > 0) {
        const appPath = path.dirname(appResponse.replaceAll("\n", ""));
        responses.push({
          id: uuidv4(),
          path: appPath,
          type: "app",
        });
      }

      if (groupResponse.trim().length > 0) {
        const groupPathSplit = groupResponse.split("\t");
        if (groupPathSplit.length === 2) {
          responses.push({
            id: uuidv4(),
            path: groupPathSplit[1].replaceAll("\n", ""),
            type: `groups - ${groupPathSplit[0]}`,
          });
        }
      }

      if (dataResponse.trim().length > 0) {
        responses.push({
          id: uuidv4(),
          path: dataResponse.replaceAll("\n", ""),
          type: "data",
        });
      }

      push(<Containers responses={responses}></Containers>);
    } catch (error: any) {
      await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
    }
  }

  function deviceChoosen(device: Device) {
    setChosenDevice(device);
  }
  return (
    <>
      {!chosenDevice && <Devices onDeviceChoose={deviceChoosen} />}

      {chosenDevice && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Execute" onSubmit={(values: Values) => handleSubmit(values)} />
            </ActionPanel>
          }
        >
          <Form.TextField id="bundleId" title="Bundle Identifier" placeholder="com.raycast" />
        </Form>
      )}
    </>
  );
}

function Containers(props: ContainersProps) {
  return (
    <List>
      {props.responses.map((item) => (
        <List.Item
          key={item.id}
          title={item.type}
          subtitle={item.path}
          actions={
            <ActionPanel>
              <Action.ShowInFinder path={item.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
interface ContainerResponse {
  path: string;
  type: string; // app | groups | data
  id: string;
}
interface ContainersProps {
  responses: ContainerResponse[];
}
