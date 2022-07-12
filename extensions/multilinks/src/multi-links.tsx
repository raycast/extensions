import { ActionPanel, Action, open, List, confirmAlert, Alert, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import Service from "./Service";
import CreateForm from "./Components/CreateForm";
import { LinkItem } from "./types";

export default function () {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = async function () {
    const links = await Service.getLinks();
    setLinks([...links]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  function openLinks(linkItem: LinkItem) {
    linkItem.links.split("\n").forEach((link) => {
      open(link, linkItem.browser);
    });
  }

  async function deleteLink(index: number) {
    const options: Alert.Options = {
      title: "Are you sure?",
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await Service.deleteLink(index);
          fetchLinks();
          showToast(Toast.Style.Success, "Multilink deleted!");
        },
      },
    };
    await confirmAlert(options);
  }

  return (
    <List
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.Push title="Create Link" target={<CreateForm onCreate={fetchLinks} />} />
        </ActionPanel>
      }
    >
      {links.map((link, index) => (
        <List.Item
          key={`${link.name}-${index}`}
          title={link.name}
          subtitle={`${link.links.split("\n").length} links`}
          actions={
            <ActionPanel>
              <Action title="Open Links" onAction={() => openLinks(link)} icon={{ source: Icon.Globe }} />
              <Action.Push
                title="Edit"
                target={<CreateForm data={link} onCreate={fetchLinks} />}
                icon={{ source: Icon.Pencil }}
              />
              <Action title="Delete" onAction={() => deleteLink(index)} icon={{ source: Icon.Trash }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
