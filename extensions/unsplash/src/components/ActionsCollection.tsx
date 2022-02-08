import { ActionPanel, Icon, useNavigation, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";

// Components
import Details from "@/views/DetailsCollections";

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
  const { push } = useNavigation();
  const imageUrl =
    item.cover_photo?.urls?.raw ||
    item.cover_photo?.urls?.full ||
    item.cover_photo?.urls?.regular ||
    item.cover_photo?.urls?.small;

  return (
    <>
      <ActionPanel.Section>
        {details && (
          <ActionPanel.Item title="Show Details" icon={Icon.List} onAction={() => push(<Details result={item} />)} />
        )}

        {item.links?.html && <OpenInBrowserAction url={item.links.html} title="Open Collection" />}

        {item.user?.links?.html && (
          <OpenInBrowserAction
            url={item.user.links.html}
            icon={Icon.Person}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            title="Open Author"
          />
        )}

        {item.id && (
          <CopyToClipboardAction
            content={item.id}
            title="Copy Collection ID to Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Links">
        {item.links?.html && (
          <CopyToClipboardAction content={item.links.html} title="Copy URL to Clipboard" icon={Icon.Clipboard} />
        )}

        {imageUrl && (
          <CopyToClipboardAction content={imageUrl} title="Copy Cover URL to Clipboard" icon={Icon.Clipboard} />
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
