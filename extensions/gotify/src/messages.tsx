import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
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

  const { messages, messageLoading, messagePagination, revalidate, deleteMessage } = useMessage({ id: selectApp });

  const getAppName = useCallback(
    (appid: number) => {
      return applications?.find((d) => d.id === appid)?.name;
    },
    [applications],
  );

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
    >
      {messages?.map((message) => (
        <List.Item
          icon={"apple-touch-icon-60x60.png"}
          key={message.id}
          title={message.title}
          keywords={[message.message, message.title, String(message.extras?.["metadata::type"])]}
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
                title={"Delete Message"}
                icon={Icon.Trash}
                onAction={() => deleteMessage(message.id)}
                style={Action.Style.Destructive}
                shortcut={Shortcut.Common.Remove}
              />
              <Action
                title={"Refresh"}
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
                shortcut={Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
