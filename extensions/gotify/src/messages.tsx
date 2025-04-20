import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { useApplication } from "./hooks/useApplication";
import { useMessage } from "./hooks/useMessage";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import Shortcut = Keyboard.Shortcut;

dayjs.extend(relativeTime);

export default function Command() {
  const [selectApp, setSelectApp] = useCachedState("select-app", "all");

  const { applications, applicationLoading } = useApplication();

  const { messages, messageLoading, messagePagination, revalidate, deleteMessage, deleteAll, handleRead } = useMessage({
    id: selectApp,
  });

  const getAppName = useCallback(
    (appid: number) => {
      return applications?.find((d) => d.id === appid)?.name;
    },
    [applications],
  );

  const handleDeleteAll = async () => {
    const options: Alert.Options = {
      title: "Delete All Messages?",
      message: (getAppName(Number(selectApp)) ?? "All") + " messages will be deleted.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: deleteAll,
      },
    };
    await confirmAlert(options);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      revalidate();
    }, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [revalidate]);

  return (
    <List
      pagination={messagePagination}
      isLoading={applicationLoading || messageLoading}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Applications" onChange={setSelectApp} value={selectApp}>
          <List.Dropdown.Item title="ALL" value="all" />
          <List.Dropdown.Section>
            {applications?.map((app) => <List.Dropdown.Item key={app.id} title={app.name} value={String(app.id)} />)}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title={"Refresh"}
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
            shortcut={Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
      onSelectionChange={handleRead}
    >
      {messages?.map((message) => (
        <List.Item
          id={String(message.id)}
          icon={"apple-touch-icon-60x60.png"}
          key={message.id}
          title={message.title}
          keywords={[message.message, message.title, String(message.extras?.["metadata::type"])]}
          accessories={[message._new ? { icon: Icon.Stars } : {}]}
          detail={
            <List.Item.Detail
              markdown={
                message.extras?.["client::notification"]?.bigImageUrl
                  ? message.message + `\n\n![notification image](${message.extras["client::notification"].bigImageUrl})`
                  : message.message
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="From" text={getAppName(message.appid)} />
                  <List.Item.Detail.Metadata.Label title="Date" text={dayjs(message.date).fromNow(true) + " ago"} />
                  {message.extras && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Extras" />
                      {message.extras["metadata::type"] && (
                        <List.Item.Detail.Metadata.Label
                          title="metadata::type"
                          text={message.extras["metadata::type"]}
                        />
                      )}
                      {message.extras["client::notification"]?.click?.url && (
                        <List.Item.Detail.Metadata.Link
                          title="client::notification"
                          target={message.extras["client::notification"].click.url}
                          text="Click Url"
                        />
                      )}
                      {Object.entries(message.extras)
                        .filter(([k]) => !["metadata::type", "client::notification"].includes(k))
                        .map(([k, v]) => (
                          <List.Item.Detail.Metadata.Label key={k} title={k} text={JSON.stringify(v)} />
                        ))}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Message" content={message.message} />
              <Action
                title={"Refresh"}
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
                shortcut={Shortcut.Common.Refresh}
              />
              <Action
                title={"Delete Message"}
                icon={Icon.Trash}
                onAction={() => deleteMessage(message.id)}
                style={Action.Style.Destructive}
                shortcut={Shortcut.Common.Remove}
              />
              <Action
                title={`Delete All Messages`}
                icon={Icon.ExclamationMark}
                onAction={handleDeleteAll}
                style={Action.Style.Destructive}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "delete",
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
