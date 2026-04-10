import { LaunchProps } from "@raycast/api";
import { TransactionsList } from "./components/TransactionsList";

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  return <TransactionsList initialQuery={props.arguments.query} />;
}
