import { Action, ActionPanel, Grid, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Unless, When } from "react-if";
import useAsyncEffect from "use-async-effect";
import type { Instance, Screenshot } from "../types";
import { getInstanceAccessories, getInstanceKeywords, getInstanceSubtitle } from "../utils/instance-display";
import {
  isPrismLauncherInstalled,
  loadFavoriteInstanceIds,
  loadInstances,
  loadScreenshotsFromInstance,
  saveScreenshotToDownloads,
} from "../utils/prism";
import NoInstall from "./no-install";

export default function MinecraftScreenshots() {
  const { data: isPrismInstalledData, isLoading: isPrismInstalledLoading } = usePromise(isPrismLauncherInstalled, []);
  const isPrismInstalled = isPrismInstalledData ?? false;

  const [instances, setInstances] = useState<Instance[]>();
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>();

  const revalidateInstances = async () => {
    const favoriteInstanceIds = await loadFavoriteInstanceIds(LocalStorage);
    const instancesList = await loadInstances(favoriteInstanceIds, false, true);
    setInstances(instancesList);
  };

  useAsyncEffect(async () => {
    if (isPrismInstalled) await revalidateInstances();
  }, [isPrismInstalled]);

  const handleInstanceSelect = async (instance: Instance) => {
    setSelectedInstance(instance);
    setScreenshots(await loadScreenshotsFromInstance(instance));
  };

  const removeScreenshot = (screenshotPath: string) => {
    setScreenshots((prev) => prev?.filter((screenshot) => screenshot.path !== screenshotPath));
  };

  const saveToDownloads = async (screenshot: Screenshot) => {
    try {
      const destination = await saveScreenshotToDownloads(screenshot);
      await showToast({ style: Toast.Style.Success, title: "Saved to Downloads", message: destination });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to save screenshot" });
    }
  };

  // Show screenshots for the selected instance
  if (selectedInstance) {
    return (
      <Grid
        columns={5}
        aspectRatio="16/9"
        fit={Grid.Fit.Fill}
        navigationTitle={selectedInstance.name}
        searchBarPlaceholder="Search screenshots..."
        isLoading={screenshots === undefined}
      >
        {screenshots && screenshots.length > 0 ? (
          screenshots.map((screenshot) => (
            <Grid.Item
              key={screenshot.path}
              content={{ source: screenshot.path }}
              title={screenshot.name}
              quickLook={{ path: screenshot.path, name: screenshot.name }}
              actions={
                <ActionPanel>
                  <Action.ToggleQuickLook />
                  <Action.CopyToClipboard
                    title="Copy Image"
                    icon={Icon.CopyClipboard}
                    content={{ file: screenshot.path }}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.ShowInFinder path={screenshot.path} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
                  <Action.Open title="Open Screenshot" target={screenshot.path} />
                  <Action
                    title="Save to Downloads"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => saveToDownloads(screenshot)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={screenshot.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Trash
                    paths={screenshot.path}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onTrash={() => removeScreenshot(screenshot.path)}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <Grid.EmptyView
            icon={Icon.Image}
            title="No screenshots found"
            description="This instance has no screenshots yet"
          />
        )}
      </Grid>
    );
  }

  // Show instances that have screenshots
  return (
    <List
      searchBarPlaceholder="Search instances by name, version or loader..."
      {...(isPrismInstalled ? { isLoading: instances === undefined } : { isLoading: isPrismInstalledLoading })}
    >
      <When condition={isPrismInstalled}>
        {instances?.map((instance, index) => (
          <List.Item
            key={`instance-${index}`}
            title={instance.name}
            subtitle={getInstanceSubtitle(instance)}
            keywords={getInstanceKeywords(instance)}
            accessories={getInstanceAccessories(instance)}
            icon={{ source: instance.icon ?? "instance-icon.png" }}
            actions={
              <ActionPanel>
                <Action title="View Screenshots" icon={Icon.Image} onAction={() => handleInstanceSelect(instance)} />
              </ActionPanel>
            }
          />
        ))}
      </When>
      <Unless condition={isPrismInstalled}>
        <NoInstall />
      </Unless>
    </List>
  );
}
