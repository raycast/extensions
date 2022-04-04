import { ActionPanel, Action, List, Color, Icon } from "@raycast/api";
import addLinksToRaycast from "./add-links";
import { RLLink } from "./utils/types";

const LinkListItem = (props: { link: RLLink; onDelete: (id: string) => Promise<void> }) => {
  //favicon source already has fallback icons, so check is not needed
  const faviconLink = () => {
    const link = props.link.link;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${link}`;
    return faviconUrl;
  };
  return (
    <List.Item
      title={props.link.title}
      subtitle={props.link.link}
      icon={faviconLink()}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* copy to clipboard action */}
            <Action.CopyToClipboard title="Copy link to clipboard" content={props.link.link} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {/* edit action */}
            <Action.Push
              title="Edit Link"
              icon={{ source: Icon.Pencil, tintColor: Color.PrimaryText }}
              target={addLinksToRaycast(props.link)}
            />
            {/* delete action */}
            <Action
              title="Delete Link"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={() => props.onDelete(props.link.id)}
            ></Action>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default LinkListItem;
