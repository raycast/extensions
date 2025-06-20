import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Detail,
  Icon,
  useNavigation,
  showHUD,
  Clipboard,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { checkTidalInstallation, getTidalCommand, executeStreamingCommand } from "./utils";
import ProgressView from "./ProgressView";
import { homedir } from "os";
import { join } from "path";

interface FavoriteType {
  id: string;
  title: string;
  subtitle: string;
  command: string;
  icon: Icon;
}

const FAVORITE_TYPES: FavoriteType[] = [
  {
    id: "tracks",
    title: "Favorite Tracks",
    subtitle: "Download all your liked tracks",
    command: "dl_fav tracks",
    icon: Icon.Music,
  },
  {
    id: "albums",
    title: "Favorite Albums",
    subtitle: "Download all your liked albums",
    command: "dl_fav albums",
    icon: Icon.Music,
  },
  {
    id: "playlists",
    title: "Favorite Playlists",
    subtitle: "Download all your saved playlists",
    command: "dl_fav playlists",
    icon: Icon.List,
  },
];

export default function DownloadFavoritesCommand() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setIsLoading(true);

    // Check if tidal-dl-ng is installed
    const installed = await checkTidalInstallation();
    setIsInstalled(installed);

    setIsLoading(false);
  }

  async function handleDownload(favoriteType: FavoriteType) {
    setIsLoading(true);

    // Execute download with Toast progress
    const result = await executeStreamingCommand(`${getTidalCommand()} ${favoriteType.command}`, {
      title: `Downloading ${favoriteType.title}`,
      showProgress: true,
    });

    if (result.success) {
      // Set download path
      const downloadPath = join(homedir(), "download");

      if (result.toast) {
        result.toast.primaryAction = {
          title: "Open Downloads Folder",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: () => {
            open(downloadPath);
          },
        };
        result.toast.secondaryAction = {
          title: "Copy Output",
          shortcut: { modifiers: ["cmd", "shift"], key: "c" },
          onAction: () => {
            Clipboard.copy(result.output);
            showHUD("Output copied to clipboard");
          },
        };
      }
    }

    setIsLoading(false);
  }

  if (isInstalled === false) {
    return (
      <Detail
        markdown="# tidal-dl-ng Not Found

Please ensure tidal-dl-ng is installed on your system (or remote server).

## Installation
```bash
pip install tidal-dl-ng
```"
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search favorite types...">
      {FAVORITE_TYPES.map((type) => (
        <List.Item
          key={type.id}
          title={type.title}
          subtitle={type.subtitle}
          icon={type.icon}
          actions={
            <ActionPanel>
              <Action title="Download" icon={Icon.Download} onAction={() => handleDownload(type)} />
              <Action
                title="Download with Details View"
                icon={Icon.Eye}
                onAction={() => {
                  // Use ProgressView for detailed output
                  push(
                    <ProgressView
                      title={`Download ${type.title}`}
                      command={type.command}
                      onComplete={(success) => {
                        if (!success) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Download Failed",
                            message: "Check the output for details",
                          });
                        }
                      }}
                    />
                  );
                }}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={checkStatus}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
