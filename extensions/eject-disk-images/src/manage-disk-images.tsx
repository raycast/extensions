import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  DiskImage,
  EjectResult,
  ejectImage,
  ejectImages,
  filterByPreferences,
  listDiskImages,
  summarize,
} from "./disk-images";

export default function Command() {
  const [eligible, setEligible] = useState<DiskImage[]>([]);
  const [skipped, setSkipped] = useState<DiskImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const split = filterByPreferences(await listDiskImages());
      setEligible(split.eligible);
      setSkipped(split.skipped);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to List Disk Images", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function report(results: EjectResult[]) {
    const failed = results.filter((r) => !r.ok);
    await showToast({
      style: failed.length ? Toast.Style.Failure : Toast.Style.Success,
      title: summarize(results),
      message: failed.map((f) => `${f.image.imageName}: ${f.error}`).join("\n") || undefined,
    });
    await refresh();
  }

  async function ejectOne(image: DiskImage, force?: boolean) {
    if (force) {
      const confirmed = await confirmAlert({
        title: `Force Eject ${image.imageName}?`,
        message: "Apps using files on this image may lose unsaved data.",
        primaryAction: { title: "Force Eject", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    await showToast({ style: Toast.Style.Animated, title: `Ejecting ${image.imageName}…` });
    await report([await ejectImage(image, force)]);
  }

  async function ejectAll() {
    if (eligible.length === 0) return;
    await showToast({ style: Toast.Style.Animated, title: `Ejecting ${eligible.length} Disk Images…` });
    await report(await ejectImages(eligible));
  }

  const renderItem = (image: DiskImage, isSkipped: boolean) => (
    <List.Item
      key={image.device}
      icon={{ source: Icon.HardDrive, tintColor: isSkipped ? Color.SecondaryText : Color.PrimaryText }}
      title={image.volumeNames[0] ?? image.imageName}
      subtitle={image.imageName}
      accessories={[
        ...(isSkipped ? [{ tag: { value: "Excluded", color: Color.Orange } }] : []),
        ...(image.mountPoints.length === 0 ? [{ tag: { value: "Not Mounted", color: Color.SecondaryText } }] : []),
        { text: image.device.replace("/dev/", "") },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Eject" icon={Icon.Eject} onAction={() => ejectOne(image)} />
            {!isSkipped && eligible.length > 1 && (
              <Action
                title={`Eject All (${eligible.length})`}
                icon={Icon.Eject}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={ejectAll}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {image.mountPoints[0] && (
              <Action.Open
                title="Open Volume"
                icon={Icon.Finder}
                target={image.mountPoints[0]}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
            <Action.ShowInFinder
              title="Show Image File in Finder"
              path={image.imagePath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action.CopyToClipboard
              title="Copy Image Path"
              content={image.imagePath}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Force Eject"
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => ejectOne(image, true)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter mounted disk images">
      {!isLoading && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Disk Images Mounted"
          description="Physical drives are never listed here."
        />
      )}
      <List.Section title="Mounted Disk Images" subtitle={String(eligible.length)}>
        {eligible.map((img) => renderItem(img, false))}
      </List.Section>
      {skipped.length > 0 && (
        <List.Section title="Excluded by Preferences" subtitle={String(skipped.length)}>
          {skipped.map((img) => renderItem(img, true))}
        </List.Section>
      )}
    </List>
  );
}
