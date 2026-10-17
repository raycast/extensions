import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";

import { Vault } from "../types";
import { SwitchAccount } from "./ActionSwitchAccount";
import { Items } from "./Items";

export function VaultActionPanel({ vault }: { vault: Vault }) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.Folder}
          onAction={() => push(<Items flags={[`--vault=${vault.id}`]} />)}
          title="Enter Vault"
        />
        {SwitchAccount()}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
