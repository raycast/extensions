import { Image, Icon, Color, Grid } from "@raycast/api";
import { GIF_SERVICE, LayoutType } from "../preferences";

import {
  ListOrGrid,
  ListOrGridDropdown,
  ListOrGridDropdownSection,
  ListOrGridDropdownItem,
  ListOrGridEmptyView,
} from "./ListOrGrid";
import { GifListSection, GifListSectionProps } from "./GifListSection";

export interface GifListProps {
  layoutType?: LayoutType;
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
  itemSize: Grid.ItemSize;
}

export function GifSearchList(props: GifListProps) {
  const { layoutType } = props;
  return (
    <ListOrGrid
      layoutType={layoutType}
      itemSize={props.itemSize}
      searchBarAccessory={
        props.showDropdown ? (
          <ListOrGridDropdown
            layoutType={props.layoutType}
            tooltip=""
            storeValue={true}
            onChange={props.onDropdownChange}
          >
            <ListOrGridDropdownSection layoutType={props.layoutType}>
              <ListOrGridDropdownItem
                layoutType={props.layoutType}
                title="Giphy"
                value={GIF_SERVICE.GIPHY}
                icon={{ source: "giphy-logo-square-180.png" }}
              />
              <ListOrGridDropdownItem
                layoutType={props.layoutType}
                title="Tenor"
                value={GIF_SERVICE.TENOR}
                icon={{ source: "tenor-logo-square-180.png" }}
              />
              <ListOrGridDropdownItem
                layoutType={props.layoutType}
                title="Finer Gifs Club"
                value={GIF_SERVICE.FINER_GIFS}
                icon={{ source: "finergifs-logo.svg", tintColor: Color.PrimaryText }}
              />
            </ListOrGridDropdownSection>
            <ListOrGridDropdownSection layoutType={props.layoutType}>
              <ListOrGridDropdownItem
                layoutType={props.layoutType}
                title="Favorites"
                value={GIF_SERVICE.FAVORITES}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <ListOrGridDropdownItem
                layoutType={props.layoutType}
                title="Recent"
                value={GIF_SERVICE.RECENTS}
                icon={{ source: Icon.Clock }}
              />
            </ListOrGridDropdownSection>
          </ListOrGridDropdown>
        ) : undefined
      }
      enableFiltering={props.enableFiltering}
      isLoading={props.isLoading}
      throttle={true}
      searchBarPlaceholder={props.searchBarPlaceholder}
      onSearchTextChange={props.onSearchTextChange}
      isShowingDetail={props.showDetail}
    >
      {props.showEmpty ? (
        <ListOrGridEmptyView layoutType={layoutType} title={props.emptyStateText} icon={props.emptyStateIcon} />
      ) : (
        props.sections.map((sProps) => (
          <GifListSection
            layoutType={sProps.layoutType}
            key={sProps.title}
            title={sProps.title}
            results={sProps.results}
            term={sProps.term}
            hide={sProps.hide}
            service={sProps.service}
          />
        ))
      )}
    </ListOrGrid>
  );
}
