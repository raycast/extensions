import { List, Action, ActionPanel, Icon, Color, useNavigation, Toast, showToast } from "@raycast/api";
import { moduleitem } from "../utils/types";
import { appendRecentModuleItem, clearRecentModuleItems } from "../utils/recent";
import { Icons, getIsCodeFile } from "../utils/utils";
import open from "open";

export const ModuleItem = (props: {
  id: number;
  url: string;
  item: moduleitem;
  show: boolean;
  getRecentItems: () => Promise<void>;
}) => {
  const append = async () => await appendRecentModuleItem(props.id, props.item);
  const { pop } = useNavigation();

  return (
    <List.Item
      title={props.item.name}
      icon={{
        source: getIsCodeFile(props.item.name)
          ? Icons["Code"]
          : props.item.passcode
          ? Icons["Passcode"]
          : props.item.type in Icons
          ? Icons[props.item.type]
          : Icon.ExclamationMark,
      }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={props.item.url}
            icon={{ source: Icon.Link }}
            onOpen={async () => {
              await append();
              await props.getRecentItems();
            }}
          />
          {props.item.download && (
            <Action
              title="Download File"
              onAction={async () => {
                await open(props.item.download, { background: true });
                await append();
                await props.getRecentItems();
              }}
              icon={{ source: Icon.Download }}
            />
          )}
          {props.item.passcode && (
            <ActionPanel.Section title="Passcode">
              <Action.CopyToClipboard
                title="Copy Passcode"
                content={props.item.passcode}
                onCopy={async () => {
                  await append();
                  await props.getRecentItems();
                }}
              />
              <Action.Paste
                title="Paste Passcode"
                content={props.item.passcode}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onPaste={async () => {
                  await append();
                  await props.getRecentItems();
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Home Page"
              icon={{ source: Icons["Home"], tintColor: Color.PrimaryText }}
              url={props.url}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            {props.show && (
              <Action
                title="Clear Recent Items"
                onAction={async () => {
                  await clearRecentModuleItems(props.id);
                  pop();
                  showToast(Toast.Style.Success, "Recent Items Cleared");
                }}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
