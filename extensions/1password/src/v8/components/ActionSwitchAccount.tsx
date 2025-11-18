import { Action, Icon, useNavigation } from "@raycast/api";

import { AccountForm } from "./AccountForm";

export function SwitchAccount() {
  const { push } = useNavigation();

  return (
    <Action
      icon={Icon.Switch}
      key="switch-account"
      onAction={() => push(<AccountForm reset={true} />)}
      title="Switch Account"
    />
  );
}
