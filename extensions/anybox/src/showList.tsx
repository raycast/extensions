import { ActionPanel, Action, List, useNavigation, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAndCloseMainWindow, fetchSidebar } from "./utilities/fetch";

interface SidebarItemProps {
  id: string;
  name: string;
  heading?: string;
  type?: string;
}

function itemTitle(item: SidebarItemProps) {
  if (item.heading) {
    return `${item.heading} > ${item.name}`;
  }
  return item.name;
}

function itemSubtitle(item: SidebarItemProps) {
  if (item.type === "filter") {
    return "Smart List";
  } else if (item.type == "collection") {
    return "Collection";
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
// Case Collection = "/show/collection/:identifier"
// Case Heading = "/show/heading/:identifier"
const presetItems: Array<SidebarItemProps> = [
  {
    id: "today",
    name: "Today",
  },
  {
    id: "starred",
    name: "Starred",
  },
  {
    id: "all",
    name: "All",
  },
  {
    id: "inbox",
    name: "Inbox",
  },
  {
    id: "link",
    name: "Link",
  },
  {
    id: "note",
    name: "Note",
  },
  {
    id: "image",
    name: "Image",
  },
  {
    id: "file",
    name: "File",
  },
  {
    id: "trash",
    name: "Trash",
  },
];

export default function Sidebar() {
  const [items, setItems] = useState<Array<SidebarItemProps>>(Array<SidebarItemProps>());
  const { pop } = useNavigation();

  useEffect(() => {
    fetchSidebar().then((sidebar) => {
      if (Array.isArray(sidebar)) {
        const allItems = [...presetItems, ...sidebar];
        setItems(allItems);
      }
    });
  }, []);

  return (
    <List isLoading={false} searchBarPlaceholder="Filter by title...">
      {items.map((item) => {
        return (
          <List.Item
            title={itemTitle(item)}
            subtitle={itemSubtitle(item)}
            icon={{ source: Icon.List, tintColor: Color.Purple }}
            accessoryTitle="Command"
            key={item.id}
            actions={
              <ActionPanel>
                <Action
                  title="Open Command"
                  onAction={() => {
                    pop();
                    if (item.type == "filter") {
                      getAndCloseMainWindow(`show/filter/${item.id}`);
                    } else if (item.type == "collection") {
                      getAndCloseMainWindow(`show/collection/${item.id}`);
                    } else {
                      getAndCloseMainWindow(`show/${item.id}`);
                    }
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
