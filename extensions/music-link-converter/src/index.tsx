import {
  Action,
  ActionPanel,
  Clipboard,
  LaunchProps,
  List,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { SongLink, ProviderConfig } from "./lib/types";
import { DEFAULT_PROVIDERS } from "./lib/store";
import { matchesSongUrlLink, convertMusicLink } from "./lib/api";
import { useLocalStorage } from "@raycast/utils";

const PROVIDERS_STORAGE_KEY = "music_providers";

export default function MusicLinkConverter(props: LaunchProps<{ arguments: { text: string | undefined } }>) {
  const [songLinks, setSongLinks] = useState<SongLink[]>();
  const [songUrlToConvert, setSongUrlToConvert] = useState("");
  const [loading, setLoading] = useState(true);
  const { value: providers } = useLocalStorage<ProviderConfig[]>(PROVIDERS_STORAGE_KEY, DEFAULT_PROVIDERS);

  useEffect(() => {
    async function findSongUrlToConvert() {
      setLoading(true);
      const clipboardText = (await Clipboard.read()).text;
      const hasArgumentMatchingSongLink =
        props.arguments.text != undefined && (await matchesSongUrlLink(props.arguments.text));
      if ((await matchesSongUrlLink(clipboardText)) && !hasArgumentMatchingSongLink) {
        setSongUrlToConvert(clipboardText);
      } else if (hasArgumentMatchingSongLink) {
        setSongUrlToConvert(props.arguments.text as string);
      } else if (!hasArgumentMatchingSongLink) {
        await showToast(Toast.Style.Failure, "No valid music URL found to convert.");
      } else {
        setLoading(false);
        await showToast(Toast.Style.Failure, "No music url found in clipboard or as argument.");
      }
    }
    findSongUrlToConvert().then();
  }, []);

  useEffect(() => {
    async function fetchSongLinkResponse() {
      setLoading(true);
      if (songUrlToConvert == undefined || songUrlToConvert.length == 0) {
        return;
      }
      try {
        const links = await convertMusicLink(songUrlToConvert);
        setSongLinks(links);
        await showToast(Toast.Style.Success, `Converted ${songUrlToConvert}`);
      } catch (error) {
        await showToast(Toast.Style.Failure, error instanceof Error ? error.message : "Failed to convert music link");
      } finally {
        setLoading(false);
      }
    }
    fetchSongLinkResponse().then();
  }, [songUrlToConvert, providers]);

  const handleCopyAllUrls = ({ withLabels = false }: { withLabels?: boolean } = {}): string => {
    if (!songLinks) return "";

    return songLinks.map((item) => `${withLabels ? `${item.label}: ` : ""}${item.link.url}`).join("\n");
  };

  return (
    <List isLoading={loading}>
      {songLinks?.map((item: SongLink) => (
        <List.Item
          key={item.label}
          title={item.label}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {item.link.nativeAppUriDesktop != null && (
                  <>
                    <Action.CopyToClipboard title={"Copy Desktop URI"} content={`${item.link.nativeAppUriDesktop}`} />
                    <Action.OpenInBrowser
                      title={"Open Desktop"}
                      url={`${item.link.nativeAppUriDesktop}`}
                      onOpen={(url: string) => Clipboard.copy(url)}
                    />
                  </>
                )}
                <Action.CopyToClipboard title={"Copy URL"} content={`${item.link.url}`} />
                <Action.OpenInBrowser
                  title={"Open URL"}
                  url={`${item.link.url}`}
                  onOpen={(url: string) => Clipboard.copy(url)}
                />
                <Action.CopyToClipboard
                  title="Copy All URLs"
                  content={handleCopyAllUrls()}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "c" },
                    Windows: { modifiers: ["ctrl"], key: "c" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy All URLs with Labels"
                  content={handleCopyAllUrls({ withLabels: true })}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
                <Action
                  title="Manage Providers"
                  icon={Icon.Gear}
                  onAction={async () => {
                    try {
                      await launchCommand({ name: "manage-providers", type: LaunchType.UserInitiated });
                    } catch (error) {
                      console.error("Failed to launch manage-providers command:", error);
                      await showToast(Toast.Style.Failure, "Failed to launch manage-providers command");
                    }
                  }}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "m" },
                    Windows: { modifiers: ["ctrl"], key: "m" },
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
