import { List } from "@raycast/api";
import { Error, getErrorTitle, getErrorMessage, getErrorIcon } from "../utils/utils";

export const EmptyView = (props: { error: Error }) => {
  const { error } = props;

  return (
    <List.EmptyView
      title={getErrorTitle(error)}
      description={getErrorMessage(error)}
      icon={{ source: getErrorIcon(error) }}
    />
  );
};
