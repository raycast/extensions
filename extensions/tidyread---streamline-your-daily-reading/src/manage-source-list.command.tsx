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
  Form,
  ActionPanel,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Source } from "./types";
import SourceForm from "./components/SourceForm";
import { capitalize, omit } from "lodash";
import { getSources, saveSources } from "./store";
import { filterByShownStatus } from "./utils/util";
import CustomActionPanel from "./components/CustomActionPanel";
import SourcesJson from "./components/SourcesJson";
import { validateSources } from "./utils/validate";
import SharableLinkAction from "./components/SharableLinkAction";

export default function SourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    loadReadItems();
  }, []);

  const loadReadItems = async () => {
    const items = await getSources();
    setSources(items);
  };

  const handleDelete = async (itemToDelete: Source) => {
    const updatedItems = sources.filter((item) => item.id !== itemToDelete.id);
    setSources(updatedItems);
    await saveSources(updatedItems);
    showToast(Toast.Style.Success, "Source deleted");
  };

  const batchImportActionNode = (
    <Action.Push
      title="Batch Import Sources"
      icon="import.svg"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      target={
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Save Source"
                onSubmit={async (values) => {
                  try {
                    const newSources = JSON.parse(values.sources) as Source[];
                    showToast(Toast.Style.Animated, "Validating sources json");
                    await validateSources(newSources);
                    const now = Date.now();
                    await saveSources([...sources, ...newSources.map((s, index) => ({ ...s, id: `${now + index}` }))]);
                    showToast(Toast.Style.Success, "Sources imported");
                    pop();
                    loadReadItems();
                  } catch (error: any) {
                    showToast(Toast.Style.Failure, "Invalid sources json", error.message);
                  }
                }}
              />
            </ActionPanel>
          }
          navigationTitle="Batch Import Sources"
        >
          <Form.TextArea id="sources" title="Sources" placeholder="Enter sources json here" />
        </Form>
      }
    />
  );

  return (
    <List>
      {sources.length === 0 ? (
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
              {batchImportActionNode}
            </CustomActionPanel>
          }
          title="No Source Found"
          description="Add your first source, or press cmd + Enter import sources from json."
        />
      ) : (
        sources.map((item, index) => {
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
                  <SharableLinkAction
                    actionTitle="Share Your Sources"
                    articleTitle="My Reading Sources"
                    articleContent={() => {
                      return `You can batch import the sources into your [Tidyread](https://tidyread.info) in 'Manage Source List' Command.\n\n\`\`\`json\n${JSON.stringify(
                        sources.map((s) => omit(s, ["id"])),
                        null,
                        4,
                      )}\n\`\`\``;
                    }}
                  />
                  {batchImportActionNode}
                  <Action.Push
                    title="Export All Sources"
                    icon="arrow-right-from-line.svg"
                    shortcut={{ modifiers: ["ctrl"], key: "e" }}
                    target={<SourcesJson />}
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
