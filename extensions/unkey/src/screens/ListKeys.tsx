import { confirmAlert, Icon, Color, Alert, showToast, Toast, List, ActionPanel, Action, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { KeyResponseData } from "@unkey/api/dist/commonjs/models/components";
import { unkey } from "../unkey";
import { GetApiInfoResponse } from "../utils/types";
import CreateKey from "./CreateKey";
import UpdateKey from "./UpdateKey";

type KeysProps = {
  apiInfo: GetApiInfoResponse;
};
function getKeyColor(key: KeyResponseData) {
  if (key.expires && new Date() > new Date(key.expires)) return Color.Red;
  if (key.credits?.remaining === 0) return Color.Red;
  return Color.Green;
}
export default function ListKeys({ apiInfo }: KeysProps) {
  const apiId = apiInfo.id;

  const {
    isLoading,
    data: keys = [],
    pagination,
    mutate,
  } = usePromise(() => async (options: { cursor?: string }) => {
    const { data, pagination } = await unkey.apis.listKeys({ apiId, limit: 50, cursor: options.cursor });
    return {
      data,
      hasMore: !!pagination?.hasMore,
      cursor: pagination?.cursor,
    };
  });

  async function confirmAndDelete(key: KeyResponseData) {
    if (
      await confirmAlert({
        icon: { source: Icon.Warning, tintColor: Color.Red },
        title: `Delete '${key.name || key.start}'?`,
        message:
          "Warning: deleting this key will remove all associated data and metadata. This action cannot be undone. Any verification, tracking, and historical usage tied to this key will be permanently lost.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting", key.name || key.start);
      try {
        await mutate(unkey.keys.deleteKey({ keyId: key.keyId }), {
          optimisticUpdate(data = []) {
            return data?.filter((k) => k.keyId !== key.keyId);
          },
          shouldRevalidateAfter: false,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Keys"
      pagination={pagination}
      actions={
        <ActionPanel>
          <Action.Push
            title="Create New Key"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<CreateKey apiInfo={apiInfo} onKeyCreated={mutate} />}
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
              title={key.name || `${key.keyId.slice(0, 8)}...${key.keyId.slice(-4)}`}
              accessories={[
                !key.enabled
                  ? {
                      icon: Icon.XMarkCircle,
                      tooltip: "This key has been manually disabled and cannot be used for any requests.",
                    }
                  : key.credits?.remaining === 0
                    ? {
                        icon: { source: Icon.Play, tintColor: Color.Orange },
                        tooltip: "This key has a low credit balance. Top it off to prevent disruptions.",
                      }
                    : {
                        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                        tooltip: "The key is operating normally.",
                      },
                { tag: new Date(key.createdAt) },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy ID to Clipboard" content={key.keyId} />
                  {!isLoading && (
                    <Action.Push
                      title="Update Key"
                      icon={Icon.Pencil}
                      target={<UpdateKey apiKey={key} onKeyUpdated={mutate} />}
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
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create New Key"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={<CreateKey apiInfo={apiInfo} onKeyCreated={mutate} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="ID" text={key.keyId} />
                      <List.Item.Detail.Metadata.TagList title="">
                        {!key.enabled ? (
                          <List.Item.Detail.Metadata.TagList.Item icon={Icon.XMarkCircle} text="Disabled" />
                        ) : key.credits?.remaining === 0 ? (
                          <List.Item.Detail.Metadata.TagList.Item
                            icon={Icon.Play}
                            text="Low Credits"
                            color={Color.Orange}
                          />
                        ) : (
                          <List.Item.Detail.Metadata.TagList.Item
                            icon={Icon.CheckCircle}
                            text="Operational"
                            color={Color.Green}
                          />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label title="API ID" text={apiId} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Start" text={key.start} />
                      <List.Item.Detail.Metadata.Label
                        title="External ID"
                        text={key.identity?.externalId ? key.identity.externalId : undefined}
                        icon={key.identity?.externalId ? undefined : Icon.Minus}
                      />
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

                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Credits" />
                      <List.Item.Detail.Metadata.Label
                        title="Remaining"
                        text={key.credits?.remaining ? key.credits.remaining.toString() : undefined}
                        icon={key.credits?.remaining || key.credits?.remaining === 0 ? undefined : Icon.Minus}
                      />

                      {!key.meta ? (
                        <List.Item.Detail.Metadata.Label title="Meta" icon={Icon.Minus} />
                      ) : (
                        <List.Item.Detail.Metadata.TagList title="Meta">
                          {Object.entries(key.meta).map(([key, val]) => (
                            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}

                      <List.Item.Detail.Metadata.Separator />
                      {key.ratelimits?.length ? (
                        <List.Item.Detail.Metadata.TagList title="Rate Limit">
                          {Object.entries(key.ratelimits[0]).map(([key, val]) => (
                            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Rate Limit" icon={Icon.Minus} />
                      )}
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
