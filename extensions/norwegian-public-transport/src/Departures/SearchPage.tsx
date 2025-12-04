import { useNavigation } from "@raycast/api";
import Search from "../Search/Search";
import DeparturesPage from "./DeparturesPage";

export default function SearchPage() {
  const { push } = useNavigation();

  return (
    <Search
      searchBarPlaceholder="Search by stop name"
      primaryActionTitle="View Departures"
      onSubmit={(venue) => push(<DeparturesPage venue={venue} />)}
    />
  );
}
