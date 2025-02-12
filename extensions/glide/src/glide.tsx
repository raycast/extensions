import { ActionPanel, Detail, List, Action, Icon, Cache, Color, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useLocalStorage, usePromise } from "@raycast/utils";
import { getApp, getApps } from "./utils";
import { useState } from "react";

export function DetailApp({ appId, appName }: { appId: string; appName?: string }) {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = usePromise(() => cacheHelper(() => getApp(preferences.apiKey, appId), "app:" + appId));

  const isImagePresent = Boolean(data?.manifest?.icons[data.manifest.icons.length - 1].src);
  const imageUrl = data?.manifest?.icons[data.manifest.icons.length - 1].src + "&raycast-width=86";
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={
        isLoading
          ? "Loading..."
          : isImagePresent
            ? `
# ${data?.manifest?.name || appName}
![App Icon](${imageUrl})
`
            : `
# ${data?.manifest?.name || appName}
`
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label icon={Icon.Person} title="Author" text={data?.manifest?.author || "No author"} />
          {/* <Detail.Metadata.Label title="Short name" text={data?.manifest?.short_name} /> */}
          {data?.manifest?.description && (
            <Detail.Metadata.Label
              title="Description"
              text={data?.manifest?.description?.length?.toString() || "No description"}
            />
          )}
          <Detail.Metadata.Separator />
          {data?.manifest && (
            // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
            <Detail.Metadata.Link title="App URL" text={"Open App"} target={data?.manifest?.start_url!} />
          )}
          <Detail.Metadata.Link
            title="Editor URL"
            text={`Edit in Glide`}
            target={`https://go.glideapps.com/app/${appId}/layout`}
          />
          {/* <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Theme color" text={data?.manifest?.theme_color} />
          <Detail.Metadata.Label title="Background color" text={data?.manifest?.background_color} /> */}
        </Detail.Metadata>
      }
    />
  );
}

const cache = new Cache();
export async function cacheHelper<T>(promise: () => Promise<T>, key: string): Promise<T> {
  const data = cache.get(key) as string;
  // console.log("raw data", data);
  if (data) {
    const parsed: T = JSON.parse(data);
    // console.log("Using cached data for key", parsed);
    return parsed;
  }
  const result = await promise();
  cache.set(key, JSON.stringify(result));
  return result;
}
import { Image } from "@raycast/api";
import { CommandGrid } from "./grid";

function CommandList() {
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data } = useCachedPromise(async () => {
    return await getApps(preferences.apiKey);
  }, []);
  // const { isLoading, data, revalidate } = usePromise(() => getApps());
  const favoritesLocalStorage = useLocalStorage<string[]>("favorites", []);

  const [authorFilter, authorSetFilter] = useState<string>("all");

  const sortedData = data
    ?.toSorted((a, b) => {
      const isFavoriteA = favoritesLocalStorage.value?.includes(a.id);
      const isFavoriteB = favoritesLocalStorage.value?.includes(b.id);
      if (isFavoriteA && !isFavoriteB) return -1;
      if (!isFavoriteA && isFavoriteB) return 1;
      return 0;
    })
    .filter((app) => {
      if (authorFilter === "all") return true;
      return app.manifest?.author === authorFilter;
    });

  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const allAuthors = Array.from(new Set(data?.map((app) => app.manifest?.author).filter(Boolean))).map((e) => e!);

  return (
    <List
      searchBarAccessory={
        <List.Dropdown value={authorFilter} onChange={(value) => authorSetFilter(value)} tooltip="Select Author">
          <List.Dropdown.Item title="All" value={"all"} />
          {allAuthors?.map((author) => {
            return <List.Dropdown.Item key={author} title={author} value={author} />;
          })}
        </List.Dropdown>
      }
      // actions={
      //   <ActionPanel>
      //     <Action title="Toggle filtering" icon={Icon.Eye} onAction={() => setIsShowingDetail(!isShowingDetail)} />
      //   </ActionPanel>
      // }
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
    >
      {sortedData?.map((app) => {
        const accessories: List.Item.Accessory[] = [];
        if (app?.manifest?.author) {
          accessories.push({ text: app.manifest?.author, icon: Icon.Person });
        }
        if (favoritesLocalStorage.value?.includes(app.id)) {
          accessories.push({ icon: Icon.Star, tag: { value: "", color: Color.Yellow } });
        }
        return (
          <List.Item
            key={app.id}
            icon={
              app?.manifest?.icons[2].src
                ? {
                    source: app?.manifest?.icons[2].src,
                    mask: Image.Mask.RoundedRectangle,
                  }
                : {
                    source: Icon.Globe,
                    tintColor: app.manifest?.background_color,
                  }
            }
            title={app.name!}
            accessories={!isShowingDetail ? accessories : []}
            subtitle={app.description || ""}
            detail={<DetailApp appId={app.id} appName={app.name} />}
            actions={
              <ActionPanel>
                <Action title="Toggle Detail" icon={Icon.Eye} onAction={() => setIsShowingDetail(!isShowingDetail)} />
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
        );
      })}
    </List>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.view === "list") {
    return <CommandList />;
  }

  return <CommandGrid />;
}
