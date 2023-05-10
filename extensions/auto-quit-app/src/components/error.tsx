import { List, ActionPanel, Action, Icon } from "@raycast/api";

type ErrorProps = List.EmptyView.Props & {
  error: string;
};

export const ErrorView = (props: ErrorProps): JSX.Element => {
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
