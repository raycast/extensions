import { useNavigation } from "@raycast/api";
import Search from "../Search/Search";
import SearchDestinationPage from "./SearchDestinationPage";

export default function SearchStartPage() {
  const { push } = useNavigation();

  return (
    <Search
      searchBarPlaceholder="Find trip from..."
      primaryActionTitle="Select Start Stop"
      onSubmit={(venue) => push(<SearchDestinationPage origin={venue} />)}
    />
  );
}
