import { Image, Icon, Color, Grid } from "@raycast/api";
import { GIF_SERVICE, GRID_COLUMNS } from "../preferences";

import { GifGridSection, GifGridSectionProps } from "./GifGridSection";

export interface GifGridProps {
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
  sections: GifGridSectionProps[];
  loadMoreGifs: () => void;
  itemSize: "small" | "medium" | "large";
}

export function GifGrid(props: GifGridProps) {
  return (
    <Grid
      columns={GRID_COLUMNS[props.itemSize]}
      searchBarAccessory={
        props.showDropdown ? (
          <Grid.Dropdown tooltip="Change GIF Provider" storeValue={true} onChange={props.onDropdownChange}>
            <Grid.Dropdown.Section>
              <Grid.Dropdown.Item
                title="Giphy GIFs"
                value={GIF_SERVICE.GIPHY}
                icon={{ source: "giphy-logo-square-180.png" }}
              />
              <Grid.Dropdown.Item
                title="Giphy Clips"
                value={GIF_SERVICE.GIPHY_CLIPS}
                icon={{ source: "giphy-logo-square-180.png" }}
              />
              <Grid.Dropdown.Item
                title="Tenor"
                value={GIF_SERVICE.TENOR}
                icon={{ source: "tenor-logo-square-180.png" }}
              />
              <Grid.Dropdown.Item
                title="Finer Gifs Club"
                value={GIF_SERVICE.FINER_GIFS}
                icon={{ source: "finergifs-logo.svg", tintColor: Color.PrimaryText }}
              />
            </Grid.Dropdown.Section>
            <Grid.Dropdown.Section>
              <Grid.Dropdown.Item
                title="Favorites"
                value={GIF_SERVICE.FAVORITES}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <Grid.Dropdown.Item title="Recent" value={GIF_SERVICE.RECENTS} icon={{ source: Icon.Clock }} />
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : undefined
      }
      filtering={props.enableFiltering}
      isLoading={props.isLoading}
      throttle={true}
      searchBarPlaceholder={props.searchBarPlaceholder}
      onSearchTextChange={props.onSearchTextChange}
    >
      {props.showEmpty ? (
        <Grid.EmptyView title={props.emptyStateText} icon={props.emptyStateIcon} />
      ) : (
        props.sections.map((sProps) => (
          <GifGridSection
            key={sProps.title}
            title={sProps.title}
            results={sProps.results}
            term={sProps.term}
            hide={sProps.hide}
            service={sProps.service}
            isLocalGifSection={sProps.isLocalGifSection}
            loadMoreGifs={props.loadMoreGifs}
          />
        ))
      )}
    </Grid>
  );
}
