import {
  Alert,
  Icon,
  Form,
  useNavigation,
  List,
  Toast,
  showToast,
  ActionPanel,
  Action,
  getPreferenceValues,
  Clipboard,
  Detail,
  openExtensionPreferences,
  confirmAlert,
} from "@raycast/api";
import axios from "axios";
import { useState, useEffect } from "react";
import { formatBytes } from "./utils";
import { deleteSubmarineFileByHash, getSubmarinedPinned, SubmarinedPinnedResponse } from "./api";

interface Preferences {
  PINATA_JWT: string;
  SUBMARINE_KEY: string;
  GATEWAY: string;
}

const preferences = getPreferenceValues<Preferences>();
const SUBMARINE_KEY = preferences.SUBMARINE_KEY;
const GATEWAY = preferences.GATEWAY;

function SubmarineDetail({ fileId, cid }) {
  const [stream, setStream] = useState(false);
  const [time, setTime] = useState("");

  const generateKey = async (fileId, cid) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "generating link" });
    try {
      const data = JSON.stringify({
        timeoutSeconds: time,
        contentIds: [`${fileId}`],
      });

      const token = await axios.post("https://managed.mypinata.cloud/api/v1/auth/content/jwt", data, {
        headers: {
          "x-api-key": SUBMARINE_KEY,
          "Content-Type": "application/json",
        },
      });
      if (stream) {
        await Clipboard.copy(`${GATEWAY}/ipfs/${cid}?accessToken=${token.data}&stream=true`);
      } else {
        await Clipboard.copy(`${GATEWAY}/ipfs/${cid}?accessToken=${token.data}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Link Generated";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  };

  if (!preferences.GATEWAY.includes("mypinata")) {
    const markdown = `
# Missing Dedicated Gateway

In order to use Submarining Commands you need to privide your [Dedicated Gateway](https://app.pinata.cloud/gateway) first! Press Enter to open the Extension Preferences to provide your Gateway.


If your plan does not include a Dedicated Gateway consider upgrading [here!](https://app.pinata.cloud/billing)
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Link" onSubmit={() => generateKey(fileId, cid)} icon={Icon.Link} />
        </ActionPanel>
      }
    >
      <Form.Description text="How long would you like the link to be valid for?" />
      <Form.Dropdown id="time" title="Time" value={time} onChange={setTime}>
        <Form.Dropdown.Item value="60" title="1 Minute" />
        <Form.Dropdown.Item value="3600" title="1 Hour" />
        <Form.Dropdown.Item value="86400" title="1 Day" />
        <Form.Dropdown.Item value="604800" title="1 Week" />
        <Form.Dropdown.Item value="2629746" title="1 Month" />
      </Form.Dropdown>
      <Form.Checkbox id="stream" label="Stream Video File" value={stream} onChange={setStream} />
    </Form>
  );
}

function SubmarineList() {
  const { push } = useNavigation();
  const { data, isLoading, mutate } = getSubmarinedPinned();

  const deleteFile = async (fileId) => {
    const options: Alert.Options = {
      title: "Delete File",
      message: "Are you sure you want to delete this file?",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting File" });

      try {
        deleteSubmarineFileByHash(fileId);
        await mutate(deleteSubmarineFileByHash(fileId), {
          optimisticUpdate(data: SubmarinedPinnedResponse) {
            return {
              ...data,
              items: data.items.filter((item) => item.id !== fileId),
            };
          },
        });

        toast.style = Toast.Style.Success;
        toast.title = "File Deleted!";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed Deleting File";
        console.log(error);
      }
    } else {
      console.log("cancelled");
    }
  };

  return (
    <List isLoading={isLoading}>
      {data?.items &&
        data.items.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            subtitle={item.cid}
            accessories={[{ text: formatBytes(item.size) }, { date: new Date(item.createdAt) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Generate Link"
                  onAction={() => push(<SubmarineDetail fileId={item.id} cid={item.cid} />)}
                  icon={Icon.Link}
                />
                <Action.CopyToClipboard title="Copy CID to Clipboard" content={item.cid} icon={Icon.CopyClipboard} />
                <Action
                  title="Delete File"
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  style={Action.Style.Destructive}
                  onAction={() => deleteFile(item.id)}
                  icon={Icon.Trash}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

export default function Command() {
  return <SubmarineList />;
}
