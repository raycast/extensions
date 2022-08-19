import { List, Icon } from "@raycast/api";

export const ErrorView = (props: { error?: string; icon?: Icon | string }): JSX.Element => {
  return (
    <List>
      <List.EmptyView
        title={props.error ? props.error : "Error"}
        description="You are in no man's land."
        icon={props.icon ? props.icon : "../assets/error.svg"}
      />
    </List>
  );
};
