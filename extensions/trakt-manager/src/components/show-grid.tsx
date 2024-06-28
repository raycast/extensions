import { Grid, Image, Keyboard } from "@raycast/api";
import { ShowGridItem } from "./show-grid-item";

export const ShowGrid = ({
  isLoading,
  searchBarPlaceholder,
  onSearchTextChange,
  searchBarAccessory,
  throttle,
  emptyViewTitle,
  pagination,
  shows,
  subtitle,
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
  shows: TraktShowList | undefined;
  pagination?: Grid.Props["pagination"];
  subtitle: (show: TraktShowListItem) => string;
  primaryActionTitle?: string;
  primaryActionIcon?: Image.ImageLike;
  primaryActionShortcut?: Keyboard.Shortcut;
  primaryAction?: (show: TraktShowListItem) => void;
  secondaryActionTitle?: string;
  secondaryActionIcon?: Image.ImageLike;
  secondaryActionShortcut?: Keyboard.Shortcut;
  secondaryAction?: (show: TraktShowListItem) => void;
  tertiaryActionTitle?: string;
  tertiaryActionIcon?: Image.ImageLike;
  tertiaryActionShortcut?: Keyboard.Shortcut;
  tertiaryAction?: (show: TraktShowListItem) => void;
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
      {shows?.map((show, index) => (
        <ShowGridItem
          key={`${show.show.ids.trakt}-${index}`}
          show={show}
          subtitle={subtitle}
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
