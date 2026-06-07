import { ActionPanel, Icon, Keyboard, Action } from "@raycast/api";
import Details from "@/views/DetailsCollections";
import { CollectionResult } from "@/types";

interface Props {
  item: CollectionResult;
  details?: boolean;
}

export function Actions({ details = false, item }: Props) {
  return (
    <ActionPanel>
      <ActionsContent details={details} item={item} />
    </ActionPanel>
  );
}

function ActionsContent({ details = false, item }: Props) {
  const coverUrl =
    item.cover_photo?.urls?.raw ||
    item.cover_photo?.urls?.full ||
    item.cover_photo?.urls?.regular ||
    item.cover_photo?.urls?.small;

  return (
    <>
      <ActionPanel.Section>
        {details && <Action.Push title="Show Details" icon={Icon.List} target={<Details result={item} />} />}
        {item.links?.html && (
          <Action.OpenInBrowser
            url={item.links.html}
            title="Open Collection"
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        )}
        {item.user?.links?.html && (
          <Action.OpenInBrowser
            url={item.user.links.html}
            icon={Icon.Person}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            title="Open Author"
          />
        )}
        {item.id && (
          <Action.CopyToClipboard
            content={item.id}
            title="Copy Collection ID"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Links">
        {item.links?.html && (
          <Action.CopyToClipboard
            content={item.links.html}
            title="Copy URL"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        )}
        {coverUrl && (
          <Action.CopyToClipboard
            content={coverUrl}
            title="Copy Cover URL"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        )}
        {item.user?.links?.html && (
          <Action.CopyToClipboard
            content={item.user.links.html}
            title="Copy Author URL"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}

export default Actions;
