import { List, Image, Icon, Color } from "@raycast/api";
import { GIF_SERVICE } from "../preferences";
import { GifListSection, GifListSectionProps } from "./GifListSection";

export interface GifListProps {
  isLoading?: boolean;
  showDropdown?: boolean;
  showDetail?: boolean;
  showEmpty?: boolean;
  enableFiltering?: boolean;
  onDropdownChange?: (newValue: string) => void;
  onSearchTextChange?: (text: string) => void;
  searchBarPlaceholder?: string;
  emptyStateText?: string;
  emptyStateIcon?: Image.ImageLike;
  sections: GifListSectionProps[];
}

export function GifSearchList(props: GifListProps) {
  return (
    <List
      searchBarAccessory={
        props.showDropdown && (
          <List.Dropdown tooltip="" storeValue={true} onChange={props.onDropdownChange}>
            <List.Dropdown.Section>
              <List.Dropdown.Item
                title="Giphy"
                value={GIF_SERVICE.GIPHY}
                icon={{ source: "giphy-logo-square-180.png" }}
              />
              <List.Dropdown.Item
                title="Tenor"
                value={GIF_SERVICE.TENOR}
                icon={{ source: "tenor-logo-square-180.png" }}
              />
              <List.Dropdown.Item
                title="Finer Gifs Club"
                value={GIF_SERVICE.FINER_GIFS}
                icon={{ source: "finergifs-logo.svg", tintColor: Color.PrimaryText }}
              />
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              <List.Dropdown.Item
                title="Favorites"
                value={GIF_SERVICE.FAVORITES}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <List.Dropdown.Item title="Recent" value={GIF_SERVICE.RECENTS} icon={{ source: Icon.Clock }} />
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
      enableFiltering={props.enableFiltering}
      isLoading={props.isLoading}
      throttle={true}
      searchBarPlaceholder={props.searchBarPlaceholder}
      onSearchTextChange={props.onSearchTextChange}
      isShowingDetail={props.showDetail}
    >
      {props.showEmpty ? (
        <List.EmptyView title={props.emptyStateText} icon={props.emptyStateIcon} />
      ) : (
        props.sections.map((sProps) => (
          <GifListSection
            key={sProps.title}
            title={sProps.title}
            results={sProps.results}
            term={sProps.term}
            hide={sProps.hide}
            service={sProps.service}
          />
        ))
      )}
    </List>
  );
}
