import { ActionPanel, Icon, useNavigation, getPreferenceValues, Action } from "@raycast/api";
import { likeOrDislike } from "@/functions/utils";

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

export const Actions: React.FC<BaseProps> = ({ details, item }) => (
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
        {details && <Action title="Show Details" icon={Icon.List} onAction={() => push(<Details result={item} />)} />}

        <Action
          title={`${item.liked_by_user ? "Unlike" : "Like"} Photo`}
          icon={Icon.Heart}
          style={item.liked_by_user ? Action.Style.Destructive : Action.Style.Regular}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => likeOrDislike(item.id, item.liked_by_user)}
        />

        {item.links?.html && <Action.OpenInBrowser url={item.links.html} title="Open Original" />}

        {item.user?.links?.html && (
          <Action.OpenInBrowser
            url={item.user.links.html}
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            title="Open Author"
          />
        )}
      </ActionPanel.Section>

      {imageUrl && (
        <>
          <ActionPanel.Section title="Image">
            <Action
              title="Copy to Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => copyFileToClipboard(clipboardCopyUrl)}
            />

            <Action
              title="Download Image"
              icon={Icon.Desktop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => saveImage({ url: imageUrl, id: String(item.id) })}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Set as Wallpaper On">
            <Action
              title="Current Monitor"
              icon={Icon.Desktop}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={() => setWallpaper({ url: imageUrl, id: String(item.id) })}
            />

            <Action
              title="Every Monitor"
              icon={Icon.Desktop}
              shortcut={{ modifiers: ["shift", "opt"], key: "w" }}
              onAction={() => setWallpaper({ url: imageUrl, id: String(item.id), every: true })}
            />
          </ActionPanel.Section>
        </>
      )}

      <ActionPanel.Section title="Links">
        {item.links?.html && (
          <Action.CopyToClipboard content={item.links.html} title="Copy URL to Clipboard" icon={Icon.Clipboard} />
        )}

        {imageUrl && (
          <Action.CopyToClipboard content={imageUrl} title="Copy Image URL to Clipboard" icon={Icon.Clipboard} />
        )}

        {item.user?.links?.html && (
          <Action.CopyToClipboard
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
