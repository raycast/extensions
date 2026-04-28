import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { CLIExecutor } from "../../core/CLIExecutor";
import { ResourceCache } from "../../core/ResourceCache";
import { useFetchWithCache } from "../../core/useFetchWithCache";
import { ImageService } from "../ImageService";
import { Image } from "../types";
import { ConfigManager } from "../../config/ConfigManager";
import { getImageStatusColor } from "../../utils/statusColors";
import { filterByName } from "../../utils/searchFilter";
import ImageDetailView from "./ImageDetailView";

interface ImagesViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

export default function ImagesView({ configName, binaryPath, cache, configManager }: ImagesViewProps) {
  const [searchText, setSearchText] = useState("");

  const cli = useMemo(() => new CLIExecutor(binaryPath, configName), [binaryPath, configName]);
  const imageService = useMemo(() => new ImageService(cli, cache, configManager), [cli, cache, configManager]);

  const fetchImages = useCallback(() => imageService.listImages(), [imageService]);
  const { data: images, isLoading, revalidate } = useFetchWithCache<Image[]>(`images:${configName}`, fetchImages);

  const filtered = filterByName(images ?? [], searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search images by name..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Images — ${configName}`}
    >
      {!isLoading && (images ?? []).length === 0 && (
        <List.EmptyView
          icon={Icon.Document}
          title="No Images Found"
          description="No images available in this project."
        />
      )}
      {filtered.map((image) => {
        const sizeDisplay = image.size != null && image.size > 0 ? `${(image.size / 1024 / 1024).toFixed(1)} MB` : "";
        return (
          <List.Item
            key={image.id}
            icon={Icon.Document}
            title={image.name}
            subtitle={image.disk_format ?? ""}
            accessories={[
              { tag: { value: image.status ?? "unknown", color: getImageStatusColor(image.status ?? "") } },
              ...(sizeDisplay ? [{ text: sizeDisplay }] : []),
              ...(image.visibility ? [{ text: image.visibility }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={
                    <ImageDetailView
                      imageId={image.id}
                      imageName={image.name}
                      binaryPath={binaryPath}
                      configName={configName}
                    />
                  }
                />
                <Action
                  title="Copy Id"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => {
                    Clipboard.copy(image.id);
                    showToast({ style: Toast.Style.Success, title: "Copied ID", message: image.id });
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
