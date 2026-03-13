import { Icon, List } from "@raycast/api";

type Props = {
  message: string;
};

const ErrorMessageView = ({ message }: Props) => {
  return (
    <List>
      <List.EmptyView icon={Icon.Warning} title={message} />
    </List>
  );
};

export default ErrorMessageView;
