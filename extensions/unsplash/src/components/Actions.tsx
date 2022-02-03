import {
  ActionPanel,
  Icon,
  useNavigation,
  getPreferenceValues,
  OpenInBrowserAction,
  CopyToClipboardAction,
} from "@raycast/api";

// Functions
import { saveImage } from "@/functions/saveImage";
import { setWallpaper } from "@/functions/setWallpaper";
import { copyFileToClipboard } from "@/functions/copyFileToClipboard";

// Components
import Details from "@/views/Details";

// Types
interface BaseProps {
  item: SearchResult;
  details?: boolean;
}

export const Actions: React.FC<BaseProps> = ({ details = false, item }) => (
  <ActionPanel>
    <Sections details={details} item={item} />
  </ActionPanel>
);

export const Sections: React.FC<BaseProps> = ({ details = false, item }) => {
  const { push } = useNavigation();
  const { downloadSize } = getPreferenceValues<UnsplashPreferences>();

  const imageUrl = item.urls?.raw || item.urls?.full || item.urls?.regular || item.urls?.small;

  const clipboardCopyUrl = {
    url: item.urls?.[downloadSize] || imageUrl,
    id: `${item.id}-${downloadSize}`,
  };

  return (
    <>
      <ActionPanel.Section>
        {details && (
          <ActionPanel.Item title="Show Details" icon={Icon.List} onAction={() => push(<Details result={item} />)} />
        )}

        {item.links?.html && <OpenInBrowserAction url={item.links.html} title="Open Original" />}

        {item.user?.links?.html && (
          <OpenInBrowserAction
            url={item.user.links.html}
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            title="Open Author"
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Image">
        {imageUrl && (
          <>
            <ActionPanel.Item
              title="Copy to Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyFileToClipboard(clipboardCopyUrl)}
            />

            <ActionPanel.Item
              title="Set as Desktop Wallpaper"
              icon={Icon.Desktop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={() => setWallpaper({ url: imageUrl, id: String(item.id) })}
            />

            <ActionPanel.Item
              title="Download Image"
              icon={Icon.Desktop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => saveImage({ url: imageUrl, id: String(item.id) })}
            />
          </>
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Links">
        {item.links?.html && (
          <CopyToClipboardAction content={item.links.html} title="Copy URL to Clipboard" icon={Icon.Clipboard} />
        )}

        {imageUrl && (
          <CopyToClipboardAction content={imageUrl} title="Copy Image URL to Clipboard" icon={Icon.Clipboard} />
        )}

        {item.user?.links?.html && (
          <CopyToClipboardAction
            content={item.user.links.html}
            title="Copy Author URL to Clipboard"
            icon={Icon.Clipboard}
          />
        )}
      </ActionPanel.Section>
    </>
  );
};

export default Actions;
