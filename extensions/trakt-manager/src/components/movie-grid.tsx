import { Grid, Image, Keyboard } from "@raycast/api";
import { MovieGridItem } from "./movie-grid-item";

export const MovieGrid = ({
  isLoading,
  searchBarPlaceholder,
  onSearchTextChange,
  searchBarAccessory,
  throttle,
  emptyViewTitle,
  pagination,
  movies,
  primaryActionTitle,
  primaryActionIcon,
  primaryActionShortcut,
  primaryAction,
  secondaryActionTitle,
  secondaryActionIcon,
  secondaryActionShortcut,
  secondaryAction,
  tertiaryActionTitle,
  tertiaryActionIcon,
  tertiaryActionShortcut,
  tertiaryAction,
}: {
  isLoading: Grid.Props["isLoading"];
  searchBarPlaceholder: Grid.Props["searchBarPlaceholder"];
  onSearchTextChange?: (text: string) => void;
  searchBarAccessory?: Grid.Props["searchBarAccessory"];
  throttle?: Grid.Props["throttle"];
  emptyViewTitle?: Grid.EmptyView.Props["title"];
  movies: TraktMovieList | undefined;
  pagination?: Grid.Props["pagination"];
  primaryActionTitle?: string;
  primaryActionIcon?: Image.ImageLike;
  primaryActionShortcut?: Keyboard.Shortcut;
  primaryAction?: (movie: TraktMovieListItem) => void;
  secondaryActionTitle?: string;
  secondaryActionIcon?: Image.ImageLike;
  secondaryActionShortcut?: Keyboard.Shortcut;
  secondaryAction?: (movie: TraktMovieListItem) => void;
  tertiaryActionTitle?: string;
  tertiaryActionIcon?: Image.ImageLike;
  tertiaryActionShortcut?: Keyboard.Shortcut;
  tertiaryAction?: (movie: TraktMovieListItem) => void;
}) => {
  return (
    <Grid
      isLoading={isLoading}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={searchBarAccessory}
      throttle={throttle}
      pagination={pagination}
    >
      <Grid.EmptyView title={emptyViewTitle} />
      {movies?.map((movie, index) => (
        <MovieGridItem
          key={`${movie.movie.ids.trakt}-${index}`}
          movie={movie}
          primaryActionTitle={primaryActionTitle}
          primaryActionIcon={primaryActionIcon}
          primaryActionShortcut={primaryActionShortcut}
          primaryAction={primaryAction}
          secondaryActionTitle={secondaryActionTitle}
          secondaryActionIcon={secondaryActionIcon}
          secondaryActionShortcut={secondaryActionShortcut}
          secondaryAction={secondaryAction}
          tertiaryActionTitle={tertiaryActionTitle}
          tertiaryActionIcon={tertiaryActionIcon}
          tertiaryActionShortcut={tertiaryActionShortcut}
          tertiaryAction={tertiaryAction}
        />
      ))}
    </Grid>
  );
};
