import { Action, Icon } from "@raycast/api";

interface Props {
  selectRepo: () => void;
}

export function SelectCurrentRepo({ selectRepo }: Props) {
  return <Action title="Update Repo" icon={Icon.Switch} onAction={selectRepo} />;
}
