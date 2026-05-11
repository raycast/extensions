import { ActionPanel, Icon, Action } from "@raycast/api";

// Components
import Details from "@/views/DetailsCollections";
import { CollectionResult } from "@/types";

// Types
interface BaseProps {
  item: CollectionResult;
  details?: boolean;
}

export const Actions: React.FC<BaseProps> = ({ details = false, item }) => (
  <ActionPanel>
    <Sections details={details} item={item} />
  </ActionPanel>
);

export const Sections: React.FC<BaseProps> = ({ details = false, item }) => {
  const imageUrl =
    item.cover_photo?.urls?.raw ||
    item.cover_photo?.urls?.full ||
    item.cover_photo?.urls?.regular ||
    item.cover_photo?.urls?.small;

  return (
    <>
      <ActionPanel.Section>
        {details && <Action.Push title="Show Details" icon={Icon.List} target={<Details result={item} />} />}

        {item.links?.html && <Action.OpenInBrowser url={item.links.html} title="Open Collection" />}

        {item.user?.links?.html && (
          <Action.OpenInBrowser
            url={item.user.links.html}
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            title="Open Author"
          />
        )}

        {Boolean(item.id) && (
          <Action.CopyToClipboard
            content={item.id}
            title="Copy Collection ID"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Links">
        {item.links?.html && (
          <Action.CopyToClipboard content={item.links.html} title="Copy URL" icon={Icon.Clipboard} />
        )}

        {imageUrl && <Action.CopyToClipboard content={imageUrl} title="Copy Cover URL" icon={Icon.Clipboard} />}

        {item.user?.links?.html && (
          <Action.CopyToClipboard content={item.user.links.html} title="Copy Author URL" icon={Icon.Clipboard} />
        )}
      </ActionPanel.Section>
    </>
  );
};

export default Actions;
