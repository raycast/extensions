import { Grid, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { getAssets, Asset, getAssetFiles } from "./api/polyhaven";
import DownloadView from "./DownloadView";
import { useSavedAssets } from "./hooks/useSavedAssets";
import { useDownload } from "./hooks/useDownload";
import { useSettings } from "./hooks/useSettings";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: assets, isLoading, error } = usePromise(getAssets, ["hdris"]);
  const { favorites, downloaded, toggleFavorite, addDownloaded } = useSavedAssets();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load HDRIs",
        message: error.message,
      });
    }
  }, [error]);
  const { downloadFile } = useDownload();
  const { settings } = useSettings();

  const handleQuickDownload = async (asset: Asset) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching download link...",
    });

    try {
      const files = await getAssetFiles(asset.id);
      const hdriFiles = files.hdri;
      if (!hdriFiles) throw new Error("No HDRI files found");

      const resolution = settings.defaultResolution;
      const format = settings.defaultFormat;

      const resGroup = hdriFiles[resolution];
      if (!resGroup) throw new Error(`Resolution ${resolution} not available`);

      const fileInfo = resGroup[format];
      if (!fileInfo) throw new Error(`Format ${format} not available for ${resolution}`);

      const fileName = `${asset.name}_${resolution}.${format}`;
      await downloadFile(fileInfo.url, fileName, (path) => addDownloaded(asset.id, path));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Quick Download Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  const filteredAssets = assets?.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchText.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "favorites") return favorites.includes(asset.id);
    if (filter === "downloaded") return !!downloaded[asset.id];
    return true;
  });

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search HDRIs..."
      itemSize={Grid.ItemSize.Medium}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter" storeValue={true} onChange={setFilter}>
          <Grid.Dropdown.Item value="all" title="All HDRIs" />
          <Grid.Dropdown.Item value="favorites" title="Favorites" />
          <Grid.Dropdown.Item value="downloaded" title="Downloaded" />
        </Grid.Dropdown>
      }
    >
      {error && !isLoading && (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Couldn't Load Catalog"
          description="Check your connection and try again."
        />
      )}
      {!error && filteredAssets && filteredAssets.length === 0 && !isLoading && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No HDRIs Found"
          description="Try adjusting your search or filter criteria."
        />
      )}
      {filteredAssets?.map((asset) => (
        <Grid.Item
          key={asset.id}
          content={asset.thumbnail_url}
          title={asset.name}
          subtitle={asset.authors ? Object.keys(asset.authors).join(", ") : undefined}
          accessory={
            favorites.includes(asset.id)
              ? { icon: Icon.Star, tooltip: "Favorited" }
              : downloaded[asset.id]
                ? { icon: Icon.CheckCircle, tooltip: "Downloaded" }
                : undefined
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Download Options"
                icon={Icon.Download}
                target={
                  <DownloadView
                    assetId={asset.id}
                    assetName={asset.name}
                    onDownload={(path) => addDownloaded(asset.id, path)}
                  />
                }
              />
              {downloaded[asset.id] && (
                <Action.CopyToClipboard
                  title="Copy Local Path"
                  content={downloaded[asset.id]}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
              <Action
                title={`Quick Download (${settings.defaultResolution} ${settings.defaultFormat.toUpperCase()})`}
                icon={Icon.Download}
                onAction={() => handleQuickDownload(asset)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title={favorites.includes(asset.id) ? "Unfavorite" : "Favorite"}
                icon={favorites.includes(asset.id) ? Icon.StarDisabled : Icon.Star}
                onAction={() => toggleFavorite(asset.id)}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <Action.OpenInBrowser title="View on Poly Haven" url={`https://polyhaven.com/a/${asset.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
