import { Action, Icon, useNavigation } from "@raycast/api";
import { AccountForm } from "./AccountForm";

export function SwitchAccount() {
  const { push } = useNavigation();
  return (
    <Action
      key="switch-account"
      title="Switch Account"
      icon={Icon.Switch}
      onAction={() => push(<AccountForm reset={true} />)}
    />
  );
}
