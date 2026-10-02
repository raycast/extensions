import { LaunchProps } from "@raycast/api";
import { TransactionList } from "./components/TransactionList";
import { WithLogins } from "./components/WithLogins";

export default function SearchTransactions(props: LaunchProps<{ launchContext: { filter?: string } }>) {
  return (
    <WithLogins>
      {(logins, reload) => (
        <TransactionList
          scope={{ kind: "all", logins }}
          onLoginsChanged={reload}
          initialFilter={props.launchContext?.filter}
        />
      )}
    </WithLogins>
  );
}
