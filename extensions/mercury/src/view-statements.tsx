import { LaunchProps } from "@raycast/api";
import { StatementList } from "./components/StatementList";
import { WithLogins } from "./components/WithLogins";

export default function ViewStatements(props: LaunchProps<{ launchContext: { accountId?: string } }>) {
  return (
    <WithLogins>
      {(logins, reload) => (
        <StatementList logins={logins} onLoginsChanged={reload} initialFilter={props.launchContext?.accountId} />
      )}
    </WithLogins>
  );
}
