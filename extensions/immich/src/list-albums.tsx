import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Album = {
  albumName: string;
  description: string;
  albumThumbnailAssetId: string;
  createdAt: string;
  updatedAt: string;
  id: string;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    name: string;
    profileImagePath: string;
    avatarColor: string;
    profileChangedAt: string;
  };
  shared: boolean;
  hasSharedLink: boolean;
  startDate: string;
  endDate: string;
  assetCount: number;
  isActivityEnabled: boolean;
  order: "desc" | "asc";
  lastModifiedAssetTimestamp: string;
};

interface Preferences {
  url: string;
  apiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  if (!preferences.url || !preferences.apiKey) {
    openExtensionPreferences();
    return <List isLoading={true} />;
  }

  const { isLoading, data } = useFetch<Album[]>(`${preferences.url}/api/albums`, {
    headers: {
      "content-type": "application/json",
      "x-api-key": preferences.apiKey,
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search albums...">
      {data?.map((album) => (
        <List.Item
          key={album.id}
          title={album.albumName}
          subtitle={album.description}
          icon={{ source: Icon.Folder }}
          keywords={[album.albumName, album.endDate.split("T")[0], album.startDate.split("T")[0]]}
          actions={
            <ActionPanel title="Actions">
              <Action.OpenInBrowser url={`${preferences.url}/albums/${album.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
