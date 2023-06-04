import { LaunchProps } from "@raycast/api";
import PeopleView from "./components/people/PeopleView";

export default function Search(props?: LaunchProps<{ arguments: { searchTerm: string } }>) {
  const searchTermArgument = props && props.arguments && props.arguments.searchTerm ? props.arguments.searchTerm : "";

  return <PeopleView defaultSearchTerm={searchTermArgument} />;
}
