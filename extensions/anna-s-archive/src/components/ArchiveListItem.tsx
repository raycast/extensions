import { type ComponentType, memo, useCallback, useMemo } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import type { ArchiveItem } from "@/api";
import { useMirrorDomain } from "@/hooks/use-mirror-domain";
import { ArchiveListItemDetail } from "@/components/ArchiveListItemDetail";
import { TestMirrorsAction } from "@/components/TestMirrorsAction";
import {
  buildCleanFileBaseName,
  buildResultUrl,
  buildSlowDownloadUrl,
  downloadEpub,
  getContainingDirectory,
  isEpub,
} from "@/api/download";

interface ArchiveListItemProps {
  item: ArchiveItem;
}

const ArchiveListItemF = ({ item }: ArchiveListItemProps) => {
  const { url: mirror } = useMirrorDomain();
  const preferences = getPreferenceValues<Preferences>();
  const annaSecretKey = preferences.annaSecretKey?.trim();
  const itemUrl = buildResultUrl(mirror, item);
  const slowDownloadUrl = buildSlowDownloadUrl(mirror, item);
  const cleanFilename = `${buildCleanFileBaseName(item)}.epub`;
  const canDownloadEpub = isEpub(item);

  const handleDownload = useCallback(async () => {
    if (!annaSecretKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Secret key missing",
        message: "Add an Anna's Archive secret key in extension preferences.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading EPUB",
      message: item.title,
    });

    try {
      const filePath = await downloadEpub(item, {
        mirror,
        annaSecretKey,
        downloadDirectory: preferences.downloadDirectory,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Downloaded EPUB";
      toast.message = filePath;
      await open(getContainingDirectory(filePath));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }, [annaSecretKey, item, mirror, preferences.downloadDirectory]);

  const icon = useMemo(() => {
    if (item.cover !== null) {
      return { source: item.cover };
    }
    return { source: Icon.Book };
  }, [item.cover]);
  return (
    <List.Item
      title={item.title}
      icon={icon}
      detail={<ArchiveListItemDetail item={item} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser title="Open in Browser" url={itemUrl} icon={Icon.Globe} />
            {canDownloadEpub && (
              <>
                <Action.OpenInBrowser title="Open Slow Download Page" url={slowDownloadUrl} icon={Icon.Download} />
                {annaSecretKey ? (
                  <Action
                    title="Download EPUB"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={handleDownload}
                  />
                ) : (
                  <Action
                    title="Set Anna's Archive Secret Key"
                    icon={Icon.Key}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={openExtensionPreferences}
                  />
                )}
              </>
            )}
            <Action.CopyToClipboard title="Copy URL to Clipboard" content={itemUrl} icon={Icon.Clipboard} />
            {canDownloadEpub && (
              <>
                <Action.CopyToClipboard
                  title="Copy Slow Download URL"
                  content={slowDownloadUrl}
                  icon={Icon.Clipboard}
                />
                <Action.CopyToClipboard
                  title="Copy Clean EPUB Filename"
                  content={cleanFilename}
                  icon={Icon.Clipboard}
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Mirrors">
            <TestMirrorsAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export const ArchiveListItem = memo(ArchiveListItemF) as ComponentType<ArchiveListItemProps>;
