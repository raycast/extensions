import { List, ActionPanel, Action, Icon } from "@raycast/api";

export type ErrorDetailProps = List.EmptyView.Props & {
  error: string;
};

export const ErrorDetail = (props: ErrorDetailProps) => {
  return (
    <List
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error" content={props.error} />
        </ActionPanel>
      }
    >
      <List.EmptyView {...props} icon={props.icon || Icon.Warning} />
    </List>
  );
};
