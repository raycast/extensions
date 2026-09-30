import { useNavigation } from "@raycast/api";
import Search from "../Search/Search";
import TripsPage from "./TripsPage";
import { Feature } from "../types";

export default function SearchDestinationPage({ origin }: { origin: Feature }) {
  const { push } = useNavigation();

  return (
    <Search
      searchBarPlaceholder={`Find trip from ${origin.properties.name} to...`}
      primaryActionTitle="Select Destination Stop"
      onSubmit={(venue) => push(<TripsPage origin={origin} destination={venue} />)}
    />
  );
}
