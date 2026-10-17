import { Action, ActionPanel, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { useState } from "react";
import AddLink, { EditLink } from "./add-link";
import { closeExtension, dataFilePath, deleteLink, executeCode, readData } from "./utils";

export default function ListLinks() {
  const { push, pop } = useNavigation();
  const [data, setData] = useState(readData());
  const links = data.links;
  const actions = data.actions;
  const refreshData = () => setData(readData());

  const handleDeleteLink = async (id: string, url: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Link",
      message: `Are you sure you want to delete "${url}"?`,
      primaryAction: { title: "Delete" },
    });
    if (confirmed) {
      deleteLink(id);
      refreshData();
    }
  };

  const addLinkAction = (
    <Action
      icon={Icon.Plus}
      title="Add Link"
      onAction={() =>
        push(
          <AddLink
            afterUpdate={() => {
              refreshData();
              pop();
            }}
          />,
        )
      }
    />
  );

  return (
    <List>
      {links.map((link) => (
        <List.Item
          key={link.id}
          icon={Icon.Link}
          title={link.url}
          subtitle={link.aliases.join(", ")}
          keywords={link.aliases}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={link.url} onOpen={closeExtension} />
                {addLinkAction}
                <Action
                  icon={Icon.Pencil}
                  title="Edit Link"
                  onAction={() =>
                    push(
                      <EditLink
                        id={link.id}
                        afterUpdate={() => {
                          refreshData();
                          pop();
                        }}
                      />,
                    )
                  }
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Link"
                  onAction={() => handleDeleteLink(link.id, link.url)}
                  style={Action.Style.Destructive}
                />
                <Action.OpenWith title="Open Config in Editor" path={dataFilePath} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {actions.map((action) => (
                  <Action.OpenInBrowser
                    key={action.id}
                    title={action.name}
                    onOpen={closeExtension}
                    shortcut={action.shortcut}
                    url={executeCode(action.code, link.url)}
                  />
                ))}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No links found" actions={<ActionPanel>{addLinkAction}</ActionPanel>} />
    </List>
  );
}
