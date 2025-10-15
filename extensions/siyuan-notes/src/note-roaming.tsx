import React, { useState, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Form,
  useNavigation,
  Detail,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanBlock } from "./types";

// Roaming types
type RoamingType =
  | "random_doc"
  | "random_block"
  | "old_notes"
  | "tag_docs"
  | "doc_blocks";

// Random roaming parameters interface
interface RandomRoamingParams {
  type: "random_doc" | "random_block";
  count: number;
}

// Old notes parameters interface
interface OldNotesParams {
  type: "old_notes";
  timeType: "months" | "years";
  timeValue: number;
  count: number;
}

// Tag roaming parameters interface
interface TagRoamingParams {
  type: "tag_docs";
  tag: string;
  count: number;
}

// Document blocks parameters interface
interface DocBlocksParams {
  type: "doc_blocks";
  docId: string;
  count: number;
}

type RoamingParams =
  | RandomRoamingParams
  | OldNotesParams
  | TagRoamingParams
  | DocBlocksParams;

// Roaming configuration form component
function RoamingConfigForm({
  onSubmit,
}: {
  onSubmit: (params: RoamingParams) => void;
}) {
  const [roamingType, setRoamingType] = useState<RoamingType>("random_doc");
  const [count, setCount] = useState<string>("1");
  const [timeType, setTimeType] = useState<"months" | "years">("months");
  const [timeValue, setTimeValue] = useState<string>("6");
  const [tag, setTag] = useState<string>("");
  const [docId, setDocId] = useState<string>("");

  // Get all tags
  const { data: tags = [] } = useCachedPromise(
    async () => {
      try {
        return await siyuanAPI.getAllTags();
      } catch (error) {
        console.error("Failed to get tags:", error);
        return [];
      }
    },
    [],
    { keepPreviousData: true },
  );

  const handleSubmit = () => {
    const countNum = parseInt(count) || 1;

    switch (roamingType) {
      case "random_doc":
      case "random_block":
        onSubmit({
          type: roamingType,
          count: countNum,
        });
        break;
      case "old_notes":
        onSubmit({
          type: "old_notes",
          timeType,
          timeValue: parseInt(timeValue) || 6,
          count: countNum,
        });
        break;
      case "tag_docs":
        if (!tag.trim()) {
          showToast({
            style: Toast.Style.Failure,
            title: "Please Enter Tag",
          });
          return;
        }
        onSubmit({
          type: roamingType,
          tag: tag.trim(),
          count: countNum,
        });
        break;
      case "doc_blocks":
        if (!docId.trim()) {
          showToast({
            style: Toast.Style.Failure,
            title: "Please Enter Document ID",
          });
          return;
        }
        onSubmit({
          type: "doc_blocks",
          docId: docId.trim(),
          count: countNum,
        });
        break;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Roaming"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="roamingType"
        title="Roaming Type"
        value={roamingType}
        onChange={(value) => setRoamingType(value as RoamingType)}
      >
        <Form.Dropdown.Section title="Random Roaming">
          <Form.Dropdown.Item
            value="random_doc"
            title="Random Document Roaming"
            icon={Icon.Document}
          />
          <Form.Dropdown.Item
            value="random_block"
            title="Random Block Roaming"
            icon={Icon.TextCursor}
          />
          <Form.Dropdown.Item
            value="old_notes"
            title="Old Notes Review"
            icon={Icon.Calendar}
          />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Themed Roaming">
          <Form.Dropdown.Item
            value="tag_docs"
            title="Tag Document Roaming"
            icon={Icon.Tag}
          />
          <Form.Dropdown.Item
            value="doc_blocks"
            title="Document Block Roaming"
            icon={Icon.Sidebar}
          />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextField
        id="count"
        title="Count"
        placeholder="Enter count to retrieve"
        value={count}
        onChange={setCount}
        info="Number of documents or blocks to retrieve"
      />

      {roamingType === "old_notes" && (
        <>
          <Form.Dropdown
            id="timeType"
            title="Time Unit"
            value={timeType}
            onChange={(value) => setTimeType(value as "months" | "years")}
          >
            <Form.Dropdown.Item value="months" title="Months" />
            <Form.Dropdown.Item value="years" title="Years" />
          </Form.Dropdown>
          <Form.TextField
            id="timeValue"
            title="Time Value"
            placeholder={`Enter number of ${timeType === "months" ? "months" : "years"}`}
            value={timeValue}
            onChange={setTimeValue}
            info={`View notes from how many ${timeType === "months" ? "months" : "years"} ago`}
          />
        </>
      )}

      {roamingType === "tag_docs" && (
        <Form.Dropdown
          id="tag"
          title="Select Tag"
          placeholder="Choose a tag"
          value={tag}
          onChange={setTag}
        >
          {tags.map((tagItem) => (
            <Form.Dropdown.Item
              key={tagItem}
              value={tagItem}
              title={tagItem}
              icon={Icon.Tag}
            />
          ))}
        </Form.Dropdown>
      )}

      {roamingType === "doc_blocks" && (
        <Form.TextField
          id="docId"
          title="Document ID"
          placeholder="Enter document ID"
          value={docId}
          onChange={setDocId}
          info="You can copy document ID from other note viewing interfaces"
        />
      )}
    </Form>
  );
}

// Roaming results display component
function RoamingResults({
  params,
  onBack,
}: {
  params: RoamingParams;
  onBack: () => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [detailContentMap, setDetailContentMap] = useState<
    Record<string, string>
  >({});
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

  // Get roaming data
  const {
    isLoading,
    data: results = [],
    revalidate,
  } = useCachedPromise(
    async () => {
      try {
        switch (params.type) {
          case "random_doc":
            return await siyuanAPI.getRandomDocuments(params.count);
          case "random_block":
            return await siyuanAPI.getRandomBlocks(params.count);
          case "old_notes":
            return await siyuanAPI.getOldNotes(
              params.timeType,
              params.timeValue,
              params.count,
            );
          case "tag_docs":
            return await siyuanAPI.getDocumentsByTag(params.tag, params.count);
          case "doc_blocks":
            return await siyuanAPI.getBlocksByDocumentId(
              params.docId,
              params.count,
            );
          default:
            return [];
        }
      } catch (error) {
        console.error("Failed to get roaming data:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Roaming Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return [];
      }
    },
    [],
    { keepPreviousData: false },
  );

  // Load specific item details
  const loadItemDetail = useCallback(
    async (item: SiYuanBlock) => {
      if (detailContentMap[item.id] || loadingItems.has(item.id)) {
        return;
      }

      setLoadingItems((prev) => new Set(prev).add(item.id));

      try {
        let content = "";
        if (item.isDocument) {
          // Document type, get complete content
          content = await siyuanAPI.getDocumentContent(item.id);
        } else {
          // Block type, use existing content
          content = item.markdown || item.content || "No content";
        }

        setDetailContentMap((prev) => ({
          ...prev,
          [item.id]: content,
        }));
      } catch (error) {
        console.error("Failed to load details:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Details",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoadingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    },
    [detailContentMap, loadingItems],
  );

  // Auto-load details when selection changes
  React.useEffect(() => {
    if (selectedItemId && results.length > 0) {
      const selectedItem = results.find((item) => item.id === selectedItemId);
      if (
        selectedItem &&
        !detailContentMap[selectedItemId] &&
        !loadingItems.has(selectedItemId)
      ) {
        loadItemDetail(selectedItem);
      }
    }
  }, [selectedItemId, results, detailContentMap, loadingItems, loadItemDetail]);

  const getRoamingTitle = () => {
    switch (params.type) {
      case "random_doc":
        return `Random Document Roaming (${params.count} items)`;
      case "random_block":
        return `Random Block Roaming (${params.count} items)`;
      case "old_notes":
        return `Old Notes Review (${params.timeValue} ${params.timeType === "months" ? "months" : "years"} ago)`;
      case "tag_docs":
        return `Tag Document Roaming (${params.tag})`;
      case "doc_blocks":
        return `Document Block Roaming`;
      default:
        return "Note Roaming";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search roaming results..."
      selectedItemId={selectedItemId}
      onSelectionChange={setSelectedItemId}
      isShowingDetail
    >
      <List.Section title={getRoamingTitle()}>
        {results.map((item) => {
          const isLoading = loadingItems.has(item.id);
          const hasDetail = detailContentMap[item.id];

          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={
                item.isDocument ? item.content : item.doc_title || "未知文档"
              }
              subtitle={item.isDocument ? item.hpath : item.content}
              accessories={[
                {
                  text: item.notebook_name,
                  icon: Icon.Book,
                },
                {
                  text: item.isDocument ? "Document" : "Block",
                  icon: item.isDocument ? Icon.Document : Icon.TextCursor,
                  tooltip: item.isDocument ? "Document" : "Content Block",
                },
                {
                  text: new Date(
                    parseInt(item.updated) * 1000,
                  ).toLocaleDateString("en-US"),
                  icon: Icon.Calendar,
                },
              ]}
              detail={
                <List.Item.Detail
                  isLoading={isLoading}
                  markdown={hasDetail ? detailContentMap[item.id] : undefined}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text={item.isDocument ? "Document" : "Content Block"}
                        icon={item.isDocument ? Icon.Document : Icon.TextCursor}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Notebook"
                        text={item.notebook_name || "Unknown"}
                        icon={Icon.Book}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Path"
                        text={item.hpath || item.doc_path || "No Path"}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Created"
                        text={new Date(
                          parseInt(item.created) * 1000,
                        ).toLocaleString("en-US")}
                        icon={Icon.Plus}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Modified"
                        text={new Date(
                          parseInt(item.updated) * 1000,
                        ).toLocaleString("en-US")}
                        icon={Icon.Pencil}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="ID"
                        text={item.id}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="View Actions">
                    <Action.OpenInBrowser
                      title="Open in Siyuan"
                      url={siyuanAPI.getDocUrl(
                        item.isDocument ? item.id : item.root_id || item.rootID,
                      )}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy Actions">
                    <Action.CopyToClipboard
                      title="Copy Title"
                      content={
                        item.isDocument ? item.content : item.doc_title || ""
                      }
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Content"
                      content={item.markdown || item.content || ""}
                    />
                    <Action.CopyToClipboard title="Copy Id" content={item.id} />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Roaming Actions">
                    <Action
                      title="Roam Again"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Back to Config"
                      icon={Icon.ArrowLeft}
                      onAction={onBack}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {results.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Content Found"
          description="Please try adjusting roaming parameters or check SiYuan connection"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Back to Config"
                icon={Icon.ArrowLeft}
                onAction={onBack}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Main component
export default function NoteRoaming() {
  const { push, pop } = useNavigation();
  const [roamingParams, setRoamingParams] = useState<RoamingParams | null>(
    null,
  );

  const handleStartRoaming = (params: RoamingParams) => {
    setRoamingParams(params);
    push(
      <RoamingResults
        params={params}
        onBack={() => {
          setRoamingParams(null);
          pop();
        }}
      />,
    );
  };

  if (roamingParams) {
    return (
      <RoamingResults
        params={roamingParams}
        onBack={() => setRoamingParams(null)}
      />
    );
  }

  return <RoamingConfigForm onSubmit={handleStartRoaming} />;
}
