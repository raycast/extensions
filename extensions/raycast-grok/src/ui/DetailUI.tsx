import { Detail, ActionPanel, Action, Keyboard, LaunchType, Icon, launchCommand } from "@raycast/api";

export interface DetailUIProps {
  isLoading: boolean;
  textStream: string;
  lastQuery: string;
  allowPaste?: boolean;
}

export default function DetailUI(props: DetailUIProps) {
  const { allowPaste = false } = props;

  return (
    <Detail
      actions={
        !props.isLoading && (
          <ActionPanel>
            {allowPaste && <Action.Paste content={props.textStream} />}
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={props.textStream} />
            {props.lastQuery && !props.isLoading && (
              <Action
                title="Continue in Chat"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
                onAction={async () => {
                  await launchCommand({
                    name: "aiChat",
                    type: LaunchType.UserInitiated,
                    context: { query: props.lastQuery, response: props.textStream, creationName: "" },
                  });
                }}
              />
            )}
            <Action
              title="View History"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              onAction={async () => {
                await launchCommand({
                  name: "history",
                  type: LaunchType.UserInitiated,
                });
              }}
            />
          </ActionPanel>
        )
      }
      isLoading={props.isLoading}
      markdown={props.textStream}
    />
  );
}
