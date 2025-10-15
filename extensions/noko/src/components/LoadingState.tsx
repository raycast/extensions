import { List } from "@raycast/api";
import { UI_MESSAGES } from "../constants";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState = ({
  message = UI_MESSAGES.LOADING.DEFAULT,
}: LoadingStateProps) => {
  return (
    <List isLoading={true}>
      <List.Item title={message} subtitle={UI_MESSAGES.LOADING.SUBTITLE} />
    </List>
  );
};
