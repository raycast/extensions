import {TenantConfiguration} from "../TenantConfiguration";
import {Action, ActionPanel, List} from "@raycast/api";
import AccountsListByCode from "./AccountsListByCode";

export type IDItemProps = {
  tenant: TenantConfiguration;
  code: string;
};

// noinspection JSUnusedGlobalSymbols
export default function CodeItem({tenant, code}: IDItemProps) {
  return <List.Item
    title="Find By Code"
    subtitle={code ? `${code} ➡️` : 'Please input a code'}
    actions={
      <ActionPanel>
        {code.length > 0 && <Action.Push
          title="Find"
          target={<AccountsListByCode tenant={tenant} code={`code-${code}`}/>}
        />}
      </ActionPanel>
    }
  />
}