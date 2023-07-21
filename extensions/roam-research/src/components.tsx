import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { saveGraphAllBlocks } from "./cache";
import { graphApiInitial } from "./roamApi";
import { useState } from "react";
import { debounce, detailMarkdown, todayUid, useEvent } from "./utils";
import { ReversePullBlock } from "./type";
import { BlockDetail } from "./detail";
import { useCachedState } from "@raycast/utils";

export const UpdateAction = ({ graph }: { graph: CachedGraph }) => {
  return (
    <Action
      icon={Icon.Download}
      title="Update"
      onAction={() => {
        const api = graphApiInitial(graph.nameField, graph.tokenField);
        showToast({
          title: graph.nameField + " updating",
          style: Toast.Style.Animated,
        });
        api.getAllBlocks().then(
          (response) => {
            showToast({
              title: graph.nameField + " updated!",
              style: Toast.Style.Success,
            });
            saveGraphAllBlocks(graph.nameField, response.result);
          },
          (err) => {
            showToast({
              title: graph.nameField + " update failuted! ",
              message: err.message,
              style: Toast.Style.Failure,
            });
          }
        );
      }}
    />
  );
};

export const AllBlocks = ({
  graph,
  blocks,
  isLoading,
  showAllFirst,
  title,
}: {
  graph: CachedGraph;
  blocks: ReversePullBlock[];
  isLoading?: boolean;
  showAllFirst?: boolean;
  title?: string;
}) => {
  const [filteredList, filterList] = useState<ReversePullBlock[]>(showAllFirst ? blocks : []);
  const changeResult = useEvent(
    debounce((text: string) => {
      text = text.trim();
      if (!text || text.length < 2) {
        return;
      }
      const keywords = text.split(" ");
      console.log(keywords, "---");
      filterList(
        blocks.filter((item) => {
          const s = item[":block/string"] || item[":node/title"] || "";
          return keywords.every((keyword) => s.includes(keyword));
        })
      );
    })
  );
  const { push } = useNavigation();
  return (
    <List
      navigationTitle={title || graph.nameField}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="At lease two texts to filter"
      onSearchTextChange={(text) => {
        changeResult(text);
      }}
      isLoading={isLoading}
    >
      {filteredList.map((block) => {
        return (
          <List.Item
            key={block[":block/uid"]}
            title={block[":block/string"] || block[":node/title"] || ""}
            detail={<List.Item.Detail markdown={detailMarkdown(block)} />}
            actions={
              <ActionPanel>
                <Action
                  title="Quick look"
                  onAction={() => {
                    push(<BlockDetail block={block} graph={graph} />);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export const DailyNoteDetail = ({ graph }: { graph: CachedGraph }) => {
  const { pop } = useNavigation();
  const [template, setTemplate] = useCachedState("dn-template", `- from [[Raycast]] at {date} \n - {content}`);
  console.log(template, " ----");
  return (
    <Form
      navigationTitle={`${graph.nameField}'s daily note`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="ok"
            onSubmit={async (values) => {
              if (!values.content) {
                showToast({
                  title: `Content cann't be empty`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              showToast({
                title: "uploading...",
                style: Toast.Style.Animated,
              });
              graphApiInitial(graph.nameField, graph.tokenField)
                .appendToDailyNote(values.content, values.template, values.date)
                .then(
                  (res) => {
                    showToast({
                      title: "Update success!",
                      style: Toast.Style.Success,
                    });
                    setTimeout(() => {
                      pop();
                    }, 500);
                  },
                  (e) => {
                    showToast({
                      title: "Update failed",
                      style: Toast.Style.Failure,
                      message: e.message,
                    });
                  }
                );
            }}
          />
          <Action.OpenInBrowser
            title="Open in browser"
            url={`https://roamresearch.com/#/app/${graph.nameField}/page/${todayUid()}`}
          />
          <Action.OpenWith title="Open in app" path={`roam://#/app/thoughtfull/page/${todayUid()}`} />
          <Action.OpenInBrowser title="View date format" url="https://day.js.org/docs/en/parse/string-format" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" />
      {/* <Form.DatePicker id="date" defaultValue={new Date()} type={Form.DatePicker.Type.DateTime} /> */}
      <Form.TextArea
        onChange={(template) => {
          setTemplate(template);
        }}
        id="template"
        title="template"
        value={template}
      />
      <Form.Description
        title=""
        text={`{date} supports {date: HH:mm:ss}(by default), 
                           {date: YYYY-MM-DD HH:mm:ss}, 
                           all formats in dayjs
Block use "one space" for indentation
      `}
      />
    </Form>
  );
};
