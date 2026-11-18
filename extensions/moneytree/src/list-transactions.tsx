import { LaunchProps } from "@raycast/api";
import { TransactionsList } from "./components/TransactionsList";

export default function Command(props: LaunchProps<{ arguments: Arguments.ListTransactions }>) {
  return <TransactionsList initialQuery={props.arguments.query} />;
}
