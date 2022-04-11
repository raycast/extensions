import { List, Icon } from "@raycast/api";
import { GifListSection, GifListSectionProps } from "./GifListSection";

export interface GifListProps {
  isLoading?: boolean;
  showDropdown?: boolean;
  showDetail?: boolean;
  showEmpty?: boolean;
  onDropdownChange?: (newValue: string) => void;
  onSearchTextChange?: (text: string) => void;
  sections: GifListSectionProps[];
}

export function GifSearchList(props: GifListProps) {
  const { isLoading, showDropdown, showDetail, showEmpty, onDropdownChange, onSearchTextChange } = props;

  return (
    <List
      searchBarAccessory={
        showDropdown && (
          <List.Dropdown tooltip="" storeValue={true} onChange={onDropdownChange}>
            <List.Dropdown.Item title="Giphy" value="giphy" />
            <List.Dropdown.Item title="Tenor" value="tenor" />
            <List.Dropdown.Item title="Finer Gifs Club" value="finergifs" />
          </List.Dropdown>
        )
      }
      enableFiltering={false}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search for gifs..."
      onSearchTextChange={onSearchTextChange}
      isShowingDetail={showDetail}
    >
      {showEmpty ? (
        <List.EmptyView title="Enter a search above to get started..." icon={Icon.MagnifyingGlass} />
      ) : (
        props.sections.map((sProps) => (
          <GifListSection
            key={sProps.title}
            title={sProps.title}
            results={sProps.results}
            term={sProps.term}
            hide={sProps.hide}
          />
        ))
      )}
    </List>
  );
}
