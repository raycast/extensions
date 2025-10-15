/* eslint-disable @raycast/prefer-title-case */
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { APP_URL, WORKSPACE_ID } from "./utils/constants";
import { unkey } from "./unkey";
import { KeyResponseData } from "@unkey/api/dist/commonjs/models/components";
import OpenInUnkey from "./components/OpenInUnkey";
import { GetApiInfoResponse } from "./utils/types";
import UpdateKey from "./screens/UpdateKey";
import CreateKey from "./screens/CreateKey";

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
          accessories={[{ tag: api.workspaceId }]}
          actions={
            <ActionPanel>
              <Action.Push title="List Keys" target={<Keys apiInfo={api} />} icon={Icon.Key} />
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
              <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={APP_URL + api.id} />
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
        const {data} = await unkey.apis.getApi({apiId: values.id});
        onApiAdded({...data, workspaceId: WORKSPACE_ID});
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

type KeysProps = {
  apiInfo: GetApiInfoResponse;
};
function Keys({ apiInfo }: KeysProps) {
  const apiId = apiInfo.id;

  const { isLoading,data: keys=[], revalidate:getFromApi, mutate } = usePromise(async() => {
    const {data} = await unkey.apis.listKeys({apiId, limit: 100});
    return data;
  })
  
  async function confirmAndDelete(key: KeyResponseData) {
    if (
      await confirmAlert({
        icon: {source: Icon.Warning, tintColor: Color.Red},
        title: `Delete '${key.name || key.start}'?`,
        message: "Warning: deleting this key will remove all associated data and metadata. This action cannot be undone. Any verification, tracking, and historical usage tied to this key will be permanently lost.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting", key.name || key.start);
      try {
        await mutate(
          unkey.keys.deleteKey({keyId: key.keyId}), {
            optimisticUpdate(data=[]) {
              return data?.filter(k => k.keyId!==key.keyId)
            },
            shouldRevalidateAfter: false
          }
        )
        toast.style = Toast.Style.Success;
        toast.title = "Deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    }
  }

  function getKeyColor(key: KeyResponseData) {
    if (key.expires && new Date() > new Date(key.expires)) return Color.Red;
    if (key.credits?.remaining===0) return Color.Red;
    return Color.Green;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Keys"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create New Key"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateKey apiInfo={apiInfo} onKeyCreated={getFromApi} />}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`API: ${apiInfo.name}`}>
        {!isLoading &&
          keys.map((key) => (
            <List.Item
              icon={{ source: Icon.Key, tintColor: getKeyColor(key) }}
              key={key.keyId}
              title={key.start}
              accessories={[{ tag: new Date(key.createdAt) }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy ID to Clipboard" content={key.keyId} />
                  {!isLoading && (
                    <Action.Push
                      title="Update Key"
                      icon={Icon.Pencil}
                      target={<UpdateKey apiKey={key} onKeyUpdated={getFromApi} />}
                    />
                  )}
                  {!isLoading && (
                    <Action
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      title="Delete Key"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => confirmAndDelete(key)}
                    />
                  )}
                  <OpenInUnkey route={`${APP_URL}${apiId}/keys/${key.keyId}`} />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create New Key"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<CreateKey apiInfo={apiInfo} onKeyCreated={getFromApi} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="ID" text={key.keyId} />
                      {/* <List.Item.Detail.Metadata.Label title="API ID" text={key.apiId} />
                      <List.Item.Detail.Metadata.Label title="Workspace ID" text={key.workspaceId} /> */}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Start" text={key.start} />
                      {/* <List.Item.Detail.Metadata.Label
                        title="Owner ID"
                        text={key.ownerId ? key.ownerId : undefined}
                        icon={key.ownerId ? undefined : Icon.Minus}
                      /> */}
                      <List.Item.Detail.Metadata.Label
                        title="Created At"
                        text={key.createdAt ? new Date(key.createdAt).toISOString() : undefined}
                        icon={key.createdAt ? undefined : Icon.Minus}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Expires"
                        text={key.expires ? new Date(key.expires).toISOString() : undefined}
                        icon={key.expires ? undefined : Icon.Minus}
                      />
                      {/* <List.Item.Detail.Metadata.Label
                        title="Remaining"
                        text={key.remaining ? key.remaining.toString() : undefined}
                        icon={key.remaining || key?.remaining === 0 ? undefined : Icon.Minus}
                      /> */}

                      {!key.meta ? (
                        <List.Item.Detail.Metadata.Label title="Meta" icon={Icon.Minus} />
                      ) : (
                        <List.Item.Detail.Metadata.TagList title="Meta">
                          {Object.entries(key.meta).map(([key, val]) => (
                            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}

                      {/* {key.ratelimit ? (
                        <List.Item.Detail.Metadata.TagList title="Rate Limit">
                          {Object.entries(key.ratelimit).map(([key, val]) => (
                            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Rate Limit" icon={Icon.Minus} />
                      )} */}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}