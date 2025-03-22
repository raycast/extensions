import { Grid } from "@raycast/api";

export const GenericGrid = <T,>({
  actions,
  aspectRatio,
  columns,
  emptyViewTitle,
  fit,
  isLoading,
  items,
  keyFn,
  onSearchTextChange,
  pagination,
  poster,
  searchBarAccessory,
  searchBarPlaceholder,
  subtitle,
  throttle,
  title,
}: {
  actions: (item: T) => Grid.Item.Props["actions"];
  aspectRatio: Grid.Props["aspectRatio"];
  columns?: Grid.Props["columns"];
  emptyViewTitle?: Grid.EmptyView.Props["title"];
  fit: Grid.Props["fit"];
  isLoading: Grid.Props["isLoading"];
  items: T[] | undefined;
  keyFn: (item: T, index: number) => React.Key;
  onSearchTextChange?: (text: string) => void;
  pagination?: Grid.Props["pagination"];
  poster: (item: T) => Grid.Item.Props["content"];
  searchBarAccessory?: Grid.Props["searchBarAccessory"];
  searchBarPlaceholder: Grid.Props["searchBarPlaceholder"];
  subtitle?: (show: T) => string;
  throttle?: Grid.Props["throttle"];
  title: (item: T) => string;
}) => {
  return (
    <Grid
      isLoading={isLoading}
      aspectRatio={aspectRatio}
      columns={columns}
      fit={fit}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={searchBarAccessory}
      throttle={throttle}
      pagination={pagination}
    >
      <Grid.EmptyView title={emptyViewTitle} />
      {items?.map((item, index) => (
        <Grid.Item
          key={keyFn(item, index)}
          title={title(item)}
          subtitle={subtitle ? subtitle(item) : ""}
          content={poster(item)}
          actions={actions(item)}
        />
      ))}
    </Grid>
  );
};
