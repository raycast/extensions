import { Action, ActionPanel, Icon } from "@raycast/api";
import GIFDetails from "./GIFDetails";
import { IGif } from "@giphy/js-types";
import { copyFile } from "../utils/giphy";
import { useApp } from "../hooks/useApp";
import { useDispatch } from "../hooks/useDispatch";
import { ViewHandle } from "../hooks/useGiphy";

export type GIFActionsProps = {
  gif: IGif;
  details?: boolean;
  onView?: ViewHandle
};

function GIFActions({ gif, details, onView }: GIFActionsProps) {
  const { recents, favs } = useApp();
  const dispatch = useDispatch();

 
  return (
    <ActionPanel>
      {!details && (
        <Action.Push
          icon={Icon.Eye}
          key={"viewDetails"}
          title="View GIF Details"
          target={<GIFDetails gif={gif} onView={onView} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      )}

      <ActionPanel.Section title="Copy">
        <Action
          icon={Icon.Clipboard}
          title="Copy File"
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          onAction={() => copyFile(gif.images.original.url, gif.slug)}
        />
        <Action.CopyToClipboard
          title="Copy Link"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          content={gif.url}
        />
      </ActionPanel.Section>
      <Action
        icon={Icon.Star}
        title={favs[gif.id] ? "Remove from Favorites" : "Add to Favorites"}
        onAction={() => {
          if (favs[gif.id]) dispatch({ type: "removeFromFavs", payload: gif.id });
          else dispatch({ type: "addToFavs", payload: gif });
        }}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      />
      {!!recents[gif.id] && (
        <Action
          icon={Icon.Clock}
          onAction={() => dispatch({ type: "removeFromRecents", payload: gif.id })}
          title="Remove from Recents"
        />
      )}
      <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "b" }} url={gif.url} />
    </ActionPanel>
  );
}

export default GIFActions;
