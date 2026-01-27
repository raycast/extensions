/* eslint-disable @raycast/prefer-title-case */
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useState } from "react";
import { unkey } from "./unkey";
import OpenInUnkey from "./components/OpenInUnkey";
import { GetApiInfoResponse } from "./utils/types";
import ListKeys from "./screens/ListKeys";

export default function Apis() {
  const [apiInfos, setApiInfos] = useCachedState<GetApiInfoResponse[]>("apiInfos", []);
  const [isLoading, setIsLoading] = useState(false);

  async function confirmAndRemove(api: GetApiInfoResponse, apiIndex: number) {
    if (
      await confirmAlert({
        title: `Remove '${api.name}'?`,
        message: `This will NOT remove the API from your Unkey Dashboard.`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const newApiInfos = apiInfos;
      newApiInfos.splice(apiIndex, 1);
      setApiInfos([...newApiInfos]);
      setIsLoading(false);
    }
  }

  async function addOrUpdate(info: GetApiInfoResponse) {
    const index = apiInfos.findIndex((item) => item.id === info.id);
    if (index !== -1) {
      const newApiInfos = apiInfos;
      newApiInfos[index] = info;
      setApiInfos([...newApiInfos]);
      await showToast({
        title: "SUCCESS",
        message: `Updated existing API Info successfully`,
      });
    } else {
      setApiInfos([info, ...apiInfos]);
      await showToast({
        title: "SUCCESS",
        message: `${info.name} added successfully`,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add API"
            shortcut={Keyboard.Shortcut.Common.New}
            icon={Icon.Plus}
            target={<AddApi onApiAdded={(info) => addOrUpdate(info)} />}
          />
        </ActionPanel>
      }
    >
      {apiInfos.map((api, apiIndex) => (
        <List.Item
          key={api.id}
          title={api.name}
          subtitle={api.id}
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action.Push title="List Keys" target={<ListKeys apiInfo={api} />} icon={Icon.Key} />
              <Action
                title="Remove API"
                onAction={() => confirmAndRemove(api, apiIndex)}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
              />
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                title="Copy API ID To Clipboard"
                content={api.id}
              />
              <OpenInUnkey route={api.id} />
              <ActionPanel.Section>
                <Action.Push
                  title="Add API"
                  shortcut={Keyboard.Shortcut.Common.New}
                  icon={Icon.Plus}
                  target={<AddApi onApiAdded={(info) => addOrUpdate(info)} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type AddApiProps = {
  onApiAdded: (info: GetApiInfoResponse) => void;
};
function AddApi({ onApiAdded }: AddApiProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  type FormValues = {
    id: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const { data } = await unkey.apis.getApi({ apiId: values.id });
        onApiAdded(data);
        pop();
      } catch {
        showToast({
          title: "Invalid API ID",
          message: "Please enter a valid API ID",
          style: Toast.Style.Failure,
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      id: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add API"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="API ID" placeholder="api_xxx" {...itemProps.id} />
    </Form>
  );
}
