import { Color, Grid, Icon } from "@raycast/api";
import type React from "react";
import { columns, layout } from "../types/preferences";
import type { ResendWallpaperWithInfo } from "../types/types";
import { getThumbnailUrl } from "../utils/common-utils";
import { ActionOnResendWallpaper } from "./action-on-resend-wallpaper";
import { ResendWallpaperEmptyView } from "./resend-wallpaper-empty-view";

export function ResendWallpaperGrid(props: {
  resendWallpapers: ResendWallpaperWithInfo[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  selectedItem: string;
  setSelectedItem: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { resendWallpapers, setRefresh, selectedItem, setSelectedItem } = props;

  return (
    <Grid
      isLoading={resendWallpapers.length === 0}
      columns={Number.parseInt(columns)}
      aspectRatio={"16/9"}
      fit={Grid.Fit.Fill}
      selectedItemId={selectedItem}
      onSelectionChange={(selected) => {
        if (selected) {
          setSelectedItem(selected);
        }
      }}
      searchBarPlaceholder={"Search wallpapers..."}
    >
      <ResendWallpaperEmptyView layout={layout} />
      {resendWallpapers.map((value, index) => {
        return (
          <Grid.Item
            id={`${index}`}
            key={`${index}-${value.title}`}
            content={getThumbnailUrl(value.url)}
            title={value.title}
            actions={
              <ActionOnResendWallpaper
                index={index}
                resendWallpapers={resendWallpapers}
                setRefresh={setRefresh}
                setSelectedItem={setSelectedItem}
              />
            }
            accessory={
              value.exclude
                ? {
                    icon: {
                      source: Icon.XMarkTopRightSquare,
                      tintColor: Color.SecondaryText,
                    },
                    tooltip: "Excluded From Auto Switch",
                  }
                : undefined
            }
          />
        );
      })}
    </Grid>
  );
}
