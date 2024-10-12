import { LaunchProps } from "@raycast/api";
import SearchResults from "./components/SearchResults";

export default function quicklySearchSelectedInstance(props: LaunchProps) {
  const { query } = props.arguments;

  return <SearchResults searchTerm={query} />;
}
