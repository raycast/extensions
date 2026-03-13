import { ActionPanel, Icon, getPreferenceValues, Action } from "@raycast/api";
import { likeOrDislike } from "@/functions/utils";
import { useState } from "react";

// Functions
import { saveImage } from "@/functions/saveImage";
import { setWallpaper } from "@/functions/setWallpaper";
import { copyFileToClipboard } from "@/functions/copyFileToClipboard";

// Components
import Details from "@/views/Details";
import { SearchResult } from "@/types";

// Types
interface BaseProps {
  item: SearchResult;
  details?: boolean;
  unlike?: React.Dispatch<React.SetStateAction<string[]>>;
}

export const Actions = ({ details, item, unlike }: BaseProps) => (
  <ActionPanel>
    <Sections details={details} item={item} unlike={unlike} />
  </ActionPanel>
);

export const Sections = ({ details = false, item, unlike }: BaseProps) => {
  const { downloadSize } = getPreferenceValues<Preferences>();
  const [liked, setLiked] = useState(item.liked_by_user);

  const imageUrl = item.urls?.raw || item.urls?.full || item.urls?.regular || item.urls?.small;

  const handleLike = async () => {
    await likeOrDislike(item.id, liked);

    if (liked && unlike) unlike((p) => [...p, String(item.id)]);
    setLiked(!liked);
  };

  const clipboardCopyUrl = {
    url: item.urls?.[downloadSize] || imageUrl,
    id: `${item.id}-${downloadSize}`,
  };

  return (
    <>
      <ActionPanel.Section>
        {details && <Action.Push title="Show Details" icon={Icon.List} target={<Details result={item} />} />}

        <Action
          title={`${liked ? "Unlike" : "Like"} Photo`}
          icon={Icon.Heart}
          style={liked ? Action.Style.Destructive : Action.Style.Regular}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={handleLike}
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
