import {
  Color,
  getPreferenceValues,
  Grid,
  Icon,
  openCommandPreferences,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { IconActions } from "./components/icon-actions.tsx";
import { search } from "./helpers/api.ts";
import { Store } from "./helpers/store.ts";
import { useDebounce } from "./helpers/utils.ts";

const preferences = getPreferenceValues<Preferences.SearchIcons>();

export default function SearchIconsCommand() {
  const { data: favorites, revalidate: revalidateFavorites } = usePromise(
    Store.getFavorites,
  );

  const { debouncedValue: searchText, setValue } = useDebounce("", 400);

  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string) => async (options: { page: number }) => {
      try {
        const response = await search(
          preferences.apiKey,
          options.page,
          searchText,
        );

        return {
          data: response.hits,
          hasMore: response.page < response.totalPages,
        };
      } catch (error) {
        showFailureToast(error, {
          title: "Could not load icons",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openCommandPreferences(),
          },
        });
        return { data: [], hasMore: false };
      }
    },
    [searchText],
    {
      keepPreviousData: true,
    },
  );

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      onSearchTextChange={setValue}
      filtering={false}
      pagination={pagination}
      searchBarPlaceholder="Search icons"
    >
      {data?.map((icon) => (
        <Grid.Item
          key={icon.objectID}
          id={icon.objectID}
          content={{
            source: icon.lowResPngUrl,
            fallback: Icon.DeleteDocument,
          }}
          title={icon.name}
          subtitle={`⤓ ${icon.downloads ?? "0"}  @ ${icon.usersName}`}
          accessory={
            favorites?.find((f) => f.objectID === icon.objectID)
              ? {
                  icon: {
                    source: Icon.Heart,
                    tintColor: Color.Green,
                  },
                }
              : {}
          }
          actions={
            <IconActions
              icon={icon}
              searchText={searchText}
              onFavoritesChange={revalidateFavorites}
            />
          }
        />
      ))}
      <Grid.EmptyView title="No icons found" />
    </Grid>
  );
}
