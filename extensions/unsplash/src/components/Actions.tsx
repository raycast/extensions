import { ActionPanel, Icon, Keyboard, getPreferenceValues, Action, showToast, Toast } from "@raycast/api";
import { apiRequest } from "@/functions/apiRequest";
import { useState } from "react";
import Details from "@/views/Details";
import { copyFileToClipboard } from "@/functions/copyFileToClipboard";
import { saveImage } from "@/functions/saveImage";
import { setWallpaper } from "@/functions/setWallpaper";
import { SearchResult } from "@/types";

interface Props {
  item: SearchResult;
  details?: boolean;
  unlike?: React.Dispatch<React.SetStateAction<string[]>>;
}

async function likeOrDislike(id: number, liked: boolean) {
  const toast = await showToast(Toast.Style.Animated, `${liked ? "Unliking" : "Liking"} photo...`);
  try {
    await apiRequest(`/photos/${id}/like`, { method: liked ? "DELETE" : "POST" });
    toast.style = Toast.Style.Success;
    toast.title = `Photo ${liked ? "unliked" : "liked"}!`;
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "An error occurred";
  }
}

export function Actions({ details, item, unlike }: Props) {
  return (
    <ActionPanel>
      <ActionsContent details={details} item={item} unlike={unlike} />
    </ActionPanel>
  );
}

function ActionsContent({ details = false, item, unlike }: Props) {
  const { downloadSize } = getPreferenceValues<Preferences>();
  const [liked, setLiked] = useState(item.liked_by_user);

  const imageUrl = item.urls.raw || item.urls.full || item.urls.regular || item.urls.small;
  const clipboardUrl = item.urls[downloadSize] || imageUrl;

  const handleLike = async () => {
    await likeOrDislike(item.id, liked);
    if (liked && unlike) unlike((prev) => [...prev, String(item.id)]);
    setLiked(!liked);
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
        {item.links?.html && (
          <Action.OpenInBrowser url={item.links.html} title="Open Original" shortcut={Keyboard.Shortcut.Common.Open} />
        )}
        {item.user?.links?.html && (
          <Action.OpenInBrowser
            url={item.user.links.html}
            icon={Icon.Person}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
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
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyFileToClipboard({ url: clipboardUrl, id: `${item.id}-${downloadSize}` })}
            />
            <Action
              title="Download Image"
              icon={Icon.Desktop}
              shortcut={Keyboard.Shortcut.Common.Save}
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
          <Action.CopyToClipboard
            content={item.links.html}
            title="Copy URL to Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        )}
        {imageUrl && (
          <Action.CopyToClipboard
            content={imageUrl}
            title="Copy Image URL to Clipboard"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        )}
        {item.user?.links?.html && (
          <Action.CopyToClipboard
            content={item.user.links.html}
            title="Copy Author URL to Clipboard"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}

export default Actions;
