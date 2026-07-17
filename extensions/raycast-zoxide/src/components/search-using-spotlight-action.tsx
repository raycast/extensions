import { Action, Icon } from "@raycast/api";
import { SpotlightResults } from "@components/spotlight-results";

export const SearchUsingSpotlightAction = ({ searchText }: { searchText?: string }) => {
  return (
    searchText && (
      <Action.Push
        title="Search Using Spotlight"
        icon={Icon.MagnifyingGlass}
        target={<SpotlightResults query={searchText} />}
      />
    )
  );
};

export default SearchUsingSpotlightAction;
