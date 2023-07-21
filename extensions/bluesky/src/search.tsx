import AccountsView from "./components/accounts/AccountsView";
import { LaunchProps } from "@raycast/api";

export default function Search(props?: LaunchProps<{ arguments: { searchTerm: string } }>) {
  const searchTermArgument = props && props.arguments && props.arguments.searchTerm ? props.arguments.searchTerm : "";

  return <AccountsView defaultSearchTerm={searchTermArgument} />;
}
