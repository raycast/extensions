import { List, Icon } from "@raycast/api";

interface IErrorProps {
  error: string;
}

export default function UnexpectedError({ error }: IErrorProps) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Unexpected Error"
      description={"Please report this error to the developer. \n Error : " + error}
    />
  );
}
