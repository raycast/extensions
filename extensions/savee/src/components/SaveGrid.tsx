import { Grid, Icon } from "@raycast/api";
import { ReactNode } from "react";
import { getSaveKeywords, getSaveTitle } from "../save-utils";
import { Save } from "../types";
import { SaveActions } from "./SaveActions";

type Pagination = {
  hasMore: boolean;
  onLoadMore: () => void;
  pageSize: number;
};

type SaveGridProps = {
  saves: Save[];
  isLoading: boolean;
  navigationTitle?: string;
  searchBarPlaceholder: string;
  pagination?: Pagination;
  onRefresh?: () => void;
  searchBarAccessory?: Grid.Props["searchBarAccessory"];
  onSearchTextChange?: (text: string) => void;
  searchText?: string;
  /** Off when the server does the searching */
  filtering?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
  emptyView?: ReactNode;
};

export function SaveGrid({
  saves,
  isLoading,
  navigationTitle,
  searchBarPlaceholder,
  pagination,
  onRefresh,
  searchBarAccessory,
  onSearchTextChange,
  searchText,
  filtering = true,
  sectionTitle,
  sectionSubtitle,
  emptyView,
}: SaveGridProps) {
  const items = saves.map((save) => (
    <Grid.Item
      key={save.id}
      content={{ source: save.media.thumbnail, fallback: Icon.Image }}
      title={getSaveTitle(save)}
      keywords={filtering ? getSaveKeywords(save) : undefined}
      accessory={save.media.type === "video" ? { icon: Icon.Video, tooltip: "Video" } : undefined}
      actions={<SaveActions save={save} onRefresh={onRefresh} />}
    />
  ));

  return (
    <Grid
      columns={5}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
      filtering={filtering}
      throttle={!filtering}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
    >
      {!isLoading && saves.length === 0 ? emptyView : null}
      {sectionTitle || sectionSubtitle ? (
        <Grid.Section title={sectionTitle} subtitle={sectionSubtitle}>
          {items}
        </Grid.Section>
      ) : (
        items
      )}
    </Grid>
  );
}
