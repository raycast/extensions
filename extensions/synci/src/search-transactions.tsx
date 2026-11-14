import type { LaunchProps } from "@raycast/api";
import { withSynci } from "./components/session";
import { TransactionList } from "./components/transaction-list";

function SearchTransactions(
  props: LaunchProps<{ arguments: { query?: string }; launchContext: { accountId?: string } }>,
) {
  const accountId = props.launchContext?.accountId;
  return (
    <TransactionList
      initialQuery={props.arguments.query}
      initialAccountId={typeof accountId === "string" && /^\d+$/.test(accountId) ? accountId : "all"}
    />
  );
}
export default withSynci(SearchTransactions);
