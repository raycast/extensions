import { ActionPanel, Grid, Action, Icon, getPreferenceValues, Image } from "@raycast/api";

import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { getApps } from "./utils";
import { useState } from "react";
// import { cacheHelper } from "./glide";

export function CommandGrid() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useCachedPromise(async () => {
    return await getApps(preferences.apiKey);
  }, []);
  const favoritesLocalStorage = useLocalStorage<string[]>("favorites", []);

  const [authorFilter, authorSetFilter] = useState<string>("all");

  const sortedData = data?.toSorted((a, b) => {
    const isFavoriteA = favoritesLocalStorage.value?.includes(a.id);
    const isFavoriteB = favoritesLocalStorage.value?.includes(b.id);
    if (isFavoriteA && !isFavoriteB) return -1;
    if (!isFavoriteA && isFavoriteB) return 1;
    return 0;
  });

  const allAuthors = Array.from(new Set(data?.map((app) => app.manifest?.author).filter(Boolean))).map((e) => e!);
  const appsByAuthor = sortedData?.reduce(
    (acc, app) => {
      const author = app.manifest?.author || "Unknown";
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(app);
      return acc;
    },
    {} as Record<string, typeof sortedData>,
  );

  const favoriteApps = sortedData?.filter((app) => favoritesLocalStorage.value?.includes(app.id));

  return (
    <Grid
      columns={6}
      inset={Grid.Inset.Small}
      searchBarAccessory={
        <Grid.Dropdown value={authorFilter} onChange={(value) => authorSetFilter(value)} tooltip="Select Author">
          <Grid.Dropdown.Item title="All" value={"all"} />
          {allAuthors?.map((author) => {
            return <Grid.Dropdown.Item key={author} title={author} value={author} />;
          })}
        </Grid.Dropdown>
      }
      isLoading={isLoading}
    >
      {authorFilter == "all" && favoriteApps && favoriteApps.length > 0 && (
        <Grid.Section title="Favorites">
          {favoriteApps.map((app) => (
            <Grid.Item
              key={app.id}
              content={
                app?.manifest?.icons[2].src
                  ? {
                      source: app?.manifest?.icons[2].src,
                      mask: Image.Mask.RoundedRectangle,
                    }
                  : {
                      source: "extension-icon.png",
                    }
              }
              title={app.name!}
              subtitle={app.description || ""}
              accessory={{
                icon: Icon.Star,
              }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    icon={Icon.Pencil}
                    title="Open Editor"
                    url={`https://go.glideapps.com/app/${app.id}/layout`}
                  />
                  {app?.manifest?.start_url && (
                    <Action.OpenInBrowser icon={Icon.AppWindow} title="Open App" url={app.manifest?.start_url} />
                  )}
                  <Action
                    title="Toggle Favorites"
                    icon={Icon.Star}
                    onAction={() => {
                      if (!favoritesLocalStorage.value) {
                        throw new Error("No favorites found");
                      }
                      if (favoritesLocalStorage.value.includes(app.id)) {
                        favoritesLocalStorage.setValue(favoritesLocalStorage.value.filter((e) => e !== app.id));
                      } else {
                        favoritesLocalStorage.setValue([...favoritesLocalStorage.value, app.id]);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
      {Object.entries(appsByAuthor || {})
        .filter(([author]) => authorFilter === "all" || author === authorFilter)
        .map(([author, apps]) => (
          <Grid.Section key={author} title={author}>
            {apps?.map((app) => (
              <Grid.Item
                key={app.id}
                content={
                  app?.manifest?.icons[2].src
                    ? {
                        source: app?.manifest?.icons[2].src,
                        mask: Image.Mask.RoundedRectangle,
                      }
                    : {
                        source: "extension-icon.png",
                      }
                }
                title={app.name!}
                subtitle={app.description || ""}
                accessory={favoritesLocalStorage.value?.includes(app.id) ? { icon: Icon.Star } : undefined}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      icon={Icon.Pencil}
                      title="Open Editor"
                      url={`https://go.glideapps.com/app/${app.id}/layout`}
                    />
                    {app?.manifest?.start_url && (
                      <Action.OpenInBrowser icon={Icon.AppWindow} title="Open App" url={app.manifest?.start_url} />
                    )}
                    <Action
                      title="Toggle Favorites"
                      icon={Icon.Star}
                      onAction={() => {
                        if (!favoritesLocalStorage.value) {
                          throw new Error("No favorites found");
                        }
                        if (favoritesLocalStorage.value.includes(app.id)) {
                          favoritesLocalStorage.setValue(favoritesLocalStorage.value.filter((e) => e !== app.id));
                        } else {
                          favoritesLocalStorage.setValue([...favoritesLocalStorage.value, app.id]);
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ))}
    </Grid>
  );
}
