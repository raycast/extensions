import { List, Action, ActionPanel, Icon, Color, Toast, showToast } from "@raycast/api";
import { moduleitem } from "../utils/types";
import { PinActions, RecentActions, useModuleStore } from "../utils/store";
import { Icons, getIsCodeFile } from "../utils/utils";
import { getPreferenceValues } from "@raycast/api";
import open from "open";

const preferences = getPreferenceValues();

export const ModuleItem = (props: {
  id: number;
  url: string;
  item: moduleitem;
  pinned?: boolean;
  recent?: boolean;
}) => {
  const { addToRecent } = useModuleStore();

  return props.item.type === "SubHeader" && props.item.url === undefined ? (
    <List.Item
      id={props.item.id.toString()}
      title={props.item.name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Title"} content={props.item.name} />
        </ActionPanel>
      }
    />
  ) : (
    <List.Item
      id={`${props.pinned ? "pin" : props.recent ? "recent" : ""}${props.item.id}`}
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
            onOpen={() => addToRecent(props.id, props.item)}
          />
          {props.item.content_id && (
            <Action
              title="Download File"
              onAction={() => {
                open(
                  `https://${preferences.domain}/courses/${props.id}/files/${props.item.content_id}/download?download_frd=1`,
                  { background: true },
                )
                  .then(() => {
                    showToast(Toast.Style.Success, "Download Started");
                    addToRecent(props.id, props.item);
                  })
                  .catch((error) => {
                    showToast({
                      title: "Download Failed",
                      message: error.message,
                      style: Toast.Style.Failure,
                    });
                  });
              }}
              icon={{ source: Icon.Download }}
            />
          )}
          {props.item.passcode && (
            <ActionPanel.Section title="Passcode">
              <Action.CopyToClipboard
                title="Copy Passcode"
                content={props.item.passcode}
                onCopy={() => addToRecent(props.id, props.item)}
              />
              <Action.Paste
                title="Paste Passcode"
                content={props.item.passcode}
                onPaste={() => addToRecent(props.id, props.item)}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <PinActions id={props.id} item={props.item} isPinned={props.pinned} />
            {props.recent && <RecentActions id={props.id} item={props.item} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Home Page"
              icon={{ source: Icons["Home"], tintColor: Color.PrimaryText }}
              url={props.url}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
