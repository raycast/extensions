import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, useNavigation } from "@raycast/api";
import { PaletteDetail } from "./PaletteDetail";
import { SearchForm } from "./SearchForm";
import { Dispatch } from "react";
import { StorageData, Tags } from "../type";
import { calculateFiles, clearCache } from "../utils/util";

export const IndexActionPanel = ({
  code,
  tags,
  setTags,
  favorite,
  isFavourite,
  unFavoriteFunc,
  favoriteFunc,
}: {
  code: string;
  tags: Tags;
  setTags: Dispatch<Tags>;
  favorite: { isLoading: boolean; value: StorageData[] | undefined };
  isFavourite: boolean;
  unFavoriteFunc?: () => Promise<void>;
  favoriteFunc?: () => Promise<void>;
}) => {
  const { pop } = useNavigation();
  const { isLoading, value } = favorite;

  return (
    <ActionPanel>
      <Action.Push target={<PaletteDetail id={code} />} title="View Details" icon={Icon.Bird} />
      <Action.Push
        target={
          <SearchForm
            tags={tags}
            submitCallback={(values) => {
              setTags(values);
              pop();
            }}
          />
        }
        title="Search Palettes"
        icon={Icon.MagnifyingGlass}
      />
      <Action
        title={isFavourite ? "Remove From Favorites" : "Like & Favorite"}
        onAction={async () => {
          if (isFavourite) {
            if (unFavoriteFunc) await unFavoriteFunc();
          } else {
            if (favoriteFunc) await favoriteFunc();
          }
        }}
        icon={isFavourite ? Icon.StarDisabled : Icon.Star}
        shortcut={Keyboard.Shortcut.Common.Pin}
      />

      {!isLoading && (
        <Action
          title="Clear All Caches"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          onAction={async () => {
            const message = await calculateFiles();

            if (
              await confirmAlert({
                title: "Are you sure?",
                message,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              })
            ) {
              // console.log("confirmed");
              await clearCache(value?.map((item) => item.svg) || []);
            }
          }}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
        />
      )}
    </ActionPanel>
  );
};
