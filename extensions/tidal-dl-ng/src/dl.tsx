import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  LaunchProps,
  useNavigation,
  Detail,
  showHUD,
  Clipboard,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { parseTidalUrl, checkTidalInstallation, getTidalCommand, executeStreamingCommand } from "./utils";
import ProgressView from "./ProgressView";
import { homedir } from "os";
import { join } from "path";

interface DownloadArguments {
  url?: string;
}

export default function DownloadCommand(props: LaunchProps<{ arguments: DownloadArguments }>) {
  const { push } = useNavigation();
  const [url, setUrl] = useState(props.arguments?.url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    checkTidalInstallation().then(setIsInstalled);
  }, []);

  if (isInstalled === null) {
    return <Detail isLoading={true} />;
  }

  if (!isInstalled) {
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

  async function handleDownload(values: { url: string }) {
    if (!values.url.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL Required",
        message: "Please enter a Tidal URL",
      });
      return;
    }

    const tidalInfo = parseTidalUrl(values.url);
    if (!tidalInfo) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please enter a valid Tidal URL",
      });
      return;
    }

    setIsLoading(true);

    // Execute download with Toast progress
    const result = await executeStreamingCommand(`${getTidalCommand()} dl "${values.url}"`, {
      title: `Downloading ${tidalInfo.type}`,
      showProgress: true,
    });

    if (result.success) {
      // Extract download path from output if available
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

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleDownload} />
          <Action
            title="Download with Details View"
            onAction={() => {
              if (!url.trim()) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "URL Required",
                  message: "Please enter a Tidal URL",
                });
                return;
              }

              const tidalInfo = parseTidalUrl(url);
              if (!tidalInfo) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Invalid URL",
                  message: "Please enter a valid Tidal URL",
                });
                return;
              }

              // Use ProgressView for detailed output
              push(
                <ProgressView
                  title={`Download ${tidalInfo.type.charAt(0).toUpperCase() + tidalInfo.type.slice(1)}`}
                  command={`dl "${url}"`}
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
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Tidal URL"
        placeholder="https://tidal.com/browse/track/12345678"
        value={url}
        onChange={setUrl}
        info="Enter a Tidal track, album, playlist, video, or artist URL"
      />
    </Form>
  );
}
