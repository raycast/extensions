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
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Source } from "./types";
import SourceForm from "./components/SourceForm";
import { capitalize, omit } from "lodash";
import { getInterestsSelected, getSources, saveInterestsSelected, saveSources } from "./store";
import { filterByShownStatus, sleep } from "./utils/util";
import CustomActionPanel from "./components/CustomActionPanel";
import SourcesJson from "./components/SourcesJson";
import { validateSources } from "./utils/validate";
import SharableLinkAction from "./components/SharableLinkAction";
import { usePromise } from "@raycast/utils";
import Onboarding from "./components/Onboarding";

export default function SourceList() {
  const [sources, setSources] = useState<Source[]>();
  const { data: interestsSelected, revalidate } = usePromise(getInterestsSelected);
  const { pop } = useNavigation();
  const showInterestsSelectPanel =
    !!sources && interestsSelected !== undefined && sources.length === 0 && interestsSelected === false;

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    const items = await getSources();
    setSources(items);
  };

  const handleDelete = async (itemToDelete: Source) => {
    const updatedItems = sources!.filter((item) => item.id !== itemToDelete.id);
    setSources(updatedItems);
    await saveSources(updatedItems);
    showToast(Toast.Style.Success, "Source Deleted");
  };

  const handleDeleteAll = async () => {
    setSources([]);
    await saveSources([]);
    showToast(Toast.Style.Success, "All Sources Deleted");
  };

  const batchImportActionNode = (
    <Action.Push
      title="Batch Import Sources"
      icon="import.svg"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      target={
        <Form
          searchBarAccessory={
            <Form.LinkAccessory
              target="https://tidyread.info/docs/batch-import-sources"
              text="🤔 Learn How To Import"
            />
          }
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Save"
                onSubmit={async (values) => {
                  try {
                    const newSources = JSON.parse(values.sources) as Partial<Source>[];
                    showToast(Toast.Style.Animated, "Validating sources json");
                    await validateSources(newSources);
                    const now = Date.now();
                    await saveSources([
                      ...sources!,
                      ...newSources.map(
                        (s, index) =>
                          ({
                            schedule: "everyday",
                            timeSpan: "1",
                            ...s,
                            id: `${now + index}`,
                          }) as Source,
                      ),
                    ]);
                    showToast(Toast.Style.Success, "Sources imported");
                    pop();
                    loadSources();
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

  if (showInterestsSelectPanel) {
    return (
      <Onboarding
        onSkip={async () => {
          await saveInterestsSelected(true);
          revalidate();
        }}
        onSuccess={async (sources) => {
          await saveInterestsSelected(true);
          await sleep(500);
          const now = Date.now();
          await saveSources(
            sources.map((s, index) => ({
              schedule: "everyday",
              timeSpan: "1",
              title: s.title!,
              url: s.url!,
              rssLink: s.rssLink,
              favicon: s.favicon,
              tags: s.tags ?? [],
              customDays: [],
              id: `${now + index}`,
            })),
          );
          showToast(Toast.Style.Success, "Sources Generated");
          await launchCommand({
            name: "daily-read.command",
            type: LaunchType.UserInitiated,
            context: {
              autoGenDigest: true,
            },
          });
          // console.log("sources", sources);
        }}
      />
    );
  }

  return (
    <List isLoading={!sources}>
      {sources?.length === 0 ? (
        <List.EmptyView
          actions={
            <CustomActionPanel>
              <Action
                title="Add Source"
                shortcut={Keyboard.Shortcut.Common.New}
                icon={Icon.Plus}
                onAction={async () => {
                  await launchCommand({ name: "add-source.command", type: LaunchType.UserInitiated });
                }}
              />
              {batchImportActionNode}
            </CustomActionPanel>
          }
          title="No Source Found"
          description="Press `Enter` to add your first source, or press `⌘ + Enter` to batch import"
        />
      ) : (
        (sources || []).map((item, index) => {
          const accessories = filterByShownStatus([
            {
              icon: "./rssicon.svg",
              tooltip: "This source has a rss link which can be used for daily digest.",
              show: !!item.rssLink,
            },
            {
              tag: {
                value: `${(item.tags || [])?.join?.(", ")}`,
                color: Color.Blue,
              },
              show: (item.tags || [])?.length > 0,
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
                        onSuccess={async () => {
                          pop();
                          loadSources();
                        }}
                      ></SourceForm>
                    }
                  />
                  <Action
                    title="Add Source"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={async () => {
                      await launchCommand({ name: "add-source.command", type: LaunchType.UserInitiated });
                    }}
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
                  <Action
                    style={Action.Style.Destructive}
                    icon={Icon.DeleteDocument}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    title="Delete All Sources"
                    onAction={async () => {
                      const flag = await confirmAlert({
                        title: "Delete All Sources",
                        icon: Icon.Trash,
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete All",
                        },
                        message: "Confirm delete all sources permanently?",
                      });
                      if (flag) {
                        handleDeleteAll();
                      }
                    }}
                  />
                  <SharableLinkAction
                    actionTitle="Share Your Sources"
                    articleTitle="My Reading Sources"
                    articleContent={() => {
                      return `You can batch import the sources into your [Tidyread](https://tidyread.info) in 'Manage Sources' Command.\n\n\`\`\`json\n${JSON.stringify(
                        sources!.map((s) => omit(s, ["id"])),
                        null,
                        4,
                      )}\n\`\`\``;
                    }}
                  />
                  <Action.Push
                    title="Export All Sources"
                    icon="arrow-right-from-line.svg"
                    shortcut={{ modifiers: ["ctrl"], key: "e" }}
                    target={<SourcesJson />}
                  />
                  {batchImportActionNode}
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
