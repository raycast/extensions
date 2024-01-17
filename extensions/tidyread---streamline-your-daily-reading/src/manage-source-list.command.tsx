import {
  Action,
  showToast,
  Toast,
  Icon,
  List,
  useNavigation,
  Color,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ReadItem } from "./types";
import SourceForm from "./components/SourceForm";
import { capitalize } from "lodash";
import { getReadItems, saveReadItems } from "./store";
import { filterByShownStatus } from "./utils/util";
import CustomActionPanel from "./components/CustomActionPanel";

export default function SourceList() {
  const [readItems, setReadItems] = useState<ReadItem[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    loadReadItems();
  }, []);

  const loadReadItems = async () => {
    const items = await getReadItems();
    setReadItems(items);
  };

  const handleDelete = async (itemToDelete: ReadItem) => {
    const updatedItems = readItems.filter((item) => item.id !== itemToDelete.id);
    setReadItems(updatedItems);
    await saveReadItems(updatedItems);
    showToast(Toast.Style.Success, "Source deleted");
  };

  return (
    <List>
      {readItems.length === 0 ? (
        <List.EmptyView
          actions={
            <CustomActionPanel>
              <Action.Push
                title="Add Source"
                shortcut={Keyboard.Shortcut.Common.New}
                icon={Icon.Plus}
                target={
                  <SourceForm
                    navigationTitle="Add Source"
                    onSuccess={() => {
                      pop();
                      loadReadItems();
                    }}
                  ></SourceForm>
                }
              />
            </CustomActionPanel>
          }
          title="No Source Found"
          description="Add your first source"
        />
      ) : (
        readItems.map((item, index) => {
          const accessories = filterByShownStatus([
            {
              icon: "./rssicon.svg",
              tooltip: "This source has a rss link which can be used for daily digest.",
              show: !!item.rssLink,
            },
            {
              tag: {
                value: item.schedule === "custom" ? item.customDays?.join?.(", ") : capitalize(item.schedule),
                color: Color.SecondaryText,
              },
              show: true,
            },
          ]);

          return (
            <List.Item
              key={index}
              title={item.title}
              icon={item.favicon || Icon.Book}
              accessories={accessories}
              actions={
                <CustomActionPanel>
                  <Action.Push
                    title="Edit Source"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <SourceForm
                        id={item.id}
                        navigationTitle="Edit Source"
                        onSuccess={() => {
                          pop();
                          loadReadItems();
                        }}
                      ></SourceForm>
                    }
                  />
                  <Action.Push
                    title="Add Source"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <SourceForm
                        navigationTitle="Add Source"
                        onSuccess={() => {
                          pop();
                          loadReadItems();
                        }}
                      ></SourceForm>
                    }
                  />
                  <Action
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    title="Delete Source"
                    onAction={async () => {
                      const flag = await confirmAlert({
                        title: "Delete Source",
                        icon: Icon.Trash,
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete",
                        },
                        message: "Confirm delete the source permanently?",
                      });
                      if (flag) {
                        handleDelete(item);
                      }
                    }}
                  />
                  {item.rssLink && (
                    <Action.OpenInBrowser
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      url={item.rssLink}
                      title="Open RSS Link"
                    />
                  )}
                </CustomActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
