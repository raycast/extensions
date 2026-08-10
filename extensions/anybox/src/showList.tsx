import { ActionPanel, Action, List, useNavigation, Icon, Color, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAndCloseMainWindow, fetchSidebar } from "./utilities/fetch";

interface SidebarItemProps {
  id: string;
  name: string;
  type?: string;
  icon?: string;
  color?: string;
}

function itemSubtitle(item: SidebarItemProps) {
  if (item.type === "filter") {
    return "Smart List";
  } else if (item.type === "tag") {
    return "Tag";
  } else if (item.type === "folder") {
    return "Folder";
  } else {
    return "Preset";
  }
}
// case Today = "/show/today"
// case Starred = "/show/starred"
// case All = "/show/all"
// case Inbox = "/show/inbox"
// case Link = "/show/link"
// case Note = "/show/note"
// case Image = "/show/image"
// case File = "/show/file"
// case Trash = "/show/trash"
// Case Filter = "/show/filter/:identifier"
// Case Tag = "/show/tag/:identifier"
// Case Folder = "/show/folder/:identifier"

export default function Sidebar() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Array<SidebarItemProps>>(Array<SidebarItemProps>());
  const { pop } = useNavigation();

  useEffect(() => {
    fetchSidebar().then((sidebar) => {
      if (Array.isArray(sidebar)) {
        setItems(sidebar);
      }
      setIsLoading(false);
    });
  }, [setIsLoading]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by list name...">
      {items.map((item) => {
        return (
          <List.Item
            title={item.name}
            icon={{
              source: `http://127.0.0.1:6391/sf-symbols/${item.icon}`,
              mask: Image.Mask.RoundedRectangle,
              fallback: Icon.List,
              tintColor: item.color || Color.Purple,
            }}
            accessories={[{ text: itemSubtitle(item) }]}
            key={item.id}
            actions={
              <ActionPanel>
                <Action
                  title={`Open ${item.name} List in Anybox`}
                  icon={{
                    source: `http://127.0.0.1:6391/sf-symbols/${item.icon}`,
                    fallback: Icon.List,
                    tintColor: item.color || Color.Purple,
                  }}
                  onAction={() => {
                    if (item.type === "filter") {
                      getAndCloseMainWindow(`show/filter/${item.id}`);
                    } else if (item.type === "tag") {
                      getAndCloseMainWindow(`show/tag/${item.id}`);
                    } else if (item.type === "folder") {
                      getAndCloseMainWindow(`show/folder/${item.id}`);
                    } else {
                      getAndCloseMainWindow(`show/${item.id}`);
                    }
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
