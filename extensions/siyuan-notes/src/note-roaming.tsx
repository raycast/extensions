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

// 漫游类型
type RoamingType =
  | "random_doc"
  | "random_block"
  | "old_notes"
  | "tag_docs"
  | "doc_blocks";

// 随机漫游参数接口
interface RandomRoamingParams {
  type: "random_doc" | "random_block";
  count: number;
}

// 年老笔记参数接口
interface OldNotesParams {
  type: "old_notes";
  timeType: "months" | "years";
  timeValue: number;
  count: number;
}

// 标签漫游参数接口
interface TagRoamingParams {
  type: "tag_docs";
  tag: string;
  count: number;
}

// 文档内漫游参数接口
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

// 漫游配置表单组件
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

  // 获取所有标签
  const { data: tags = [] } = useCachedPromise(
    async () => {
      try {
        return await siyuanAPI.getAllTags();
      } catch (error) {
        console.error("获取标签失败:", error);
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
            title: "请输入标签",
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
            title: "请输入文档ID",
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
            title="开始漫游"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="roamingType"
        title="漫游类型"
        value={roamingType}
        onChange={(value) => setRoamingType(value as RoamingType)}
      >
        <Form.Dropdown.Section title="完全随机漫游">
          <Form.Dropdown.Item
            value="random_doc"
            title="随机文档漫游"
            icon={Icon.Document}
          />
          <Form.Dropdown.Item
            value="random_block"
            title="随机块漫游"
            icon={Icon.TextCursor}
          />
          <Form.Dropdown.Item
            value="old_notes"
            title="年老笔记回顾"
            icon={Icon.Calendar}
          />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="主题漫游">
          <Form.Dropdown.Item
            value="tag_docs"
            title="标签文档漫游"
            icon={Icon.Tag}
          />
          <Form.Dropdown.Item
            value="doc_blocks"
            title="文档内块漫游"
            icon={Icon.Sidebar}
          />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextField
        id="count"
        title="数量"
        placeholder="输入要获取的数量"
        value={count}
        onChange={setCount}
        info="要获取的文档或块的数量"
      />

      {roamingType === "old_notes" && (
        <>
          <Form.Dropdown
            id="timeType"
            title="时间单位"
            value={timeType}
            onChange={(value) => setTimeType(value as "months" | "years")}
          >
            <Form.Dropdown.Item value="months" title="月" />
            <Form.Dropdown.Item value="years" title="年" />
          </Form.Dropdown>
          <Form.TextField
            id="timeValue"
            title="时间值"
            placeholder={`输入${timeType === "months" ? "月" : "年"}数`}
            value={timeValue}
            onChange={setTimeValue}
            info={`查看多少${timeType === "months" ? "个月" : "年"}前的笔记`}
          />
        </>
      )}

      {roamingType === "tag_docs" && (
        <Form.Dropdown
          id="tag"
          title="选择标签"
          placeholder="选择一个标签"
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
          title="文档ID"
          placeholder="输入文档ID"
          value={docId}
          onChange={setDocId}
          info="可以从其他笔记查看界面复制文档ID"
        />
      )}
    </Form>
  );
}

// 漫游结果显示组件
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

  // 获取漫游数据
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
        console.error("漫游数据获取失败:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "漫游失败",
          message: error instanceof Error ? error.message : "未知错误",
        });
        return [];
      }
    },
    [],
    { keepPreviousData: false },
  );

  // 加载特定项目的详情内容
  const loadItemDetail = useCallback(
    async (item: SiYuanBlock) => {
      if (detailContentMap[item.id] || loadingItems.has(item.id)) {
        return;
      }

      setLoadingItems((prev) => new Set(prev).add(item.id));

      try {
        let content = "";
        if (item.isDocument) {
          // 文档类型，获取完整内容
          content = await siyuanAPI.getDocumentContent(item.id);
        } else {
          // 块类型，使用现有内容
          content = item.markdown || item.content || "无内容";
        }

        setDetailContentMap((prev) => ({
          ...prev,
          [item.id]: content,
        }));
      } catch (error) {
        console.error("加载详情失败:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "加载详情失败",
          message: error instanceof Error ? error.message : "未知错误",
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

  // 当选择改变时，自动加载详情
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
        return `随机文档漫游 (${params.count}个)`;
      case "random_block":
        return `随机块漫游 (${params.count}个)`;
      case "old_notes":
        return `年老笔记回顾 (${params.timeValue}${params.timeType === "months" ? "个月" : "年"}前)`;
      case "tag_docs":
        return `标签文档漫游 (${params.tag})`;
      case "doc_blocks":
        return `文档内块漫游`;
      default:
        return "笔记漫游";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索漫游结果..."
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
                  text: item.isDocument ? "文档" : "块",
                  icon: item.isDocument ? Icon.Document : Icon.TextCursor,
                  tooltip: item.isDocument ? "文档" : "内容块",
                },
                {
                  text: new Date(
                    parseInt(item.updated) * 1000,
                  ).toLocaleDateString("zh-CN"),
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
                        title="类型"
                        text={item.isDocument ? "文档" : "内容块"}
                        icon={item.isDocument ? Icon.Document : Icon.TextCursor}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="笔记本"
                        text={item.notebook_name || "未知"}
                        icon={Icon.Book}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="路径"
                        text={item.hpath || item.doc_path || "无路径"}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="创建时间"
                        text={new Date(
                          parseInt(item.created) * 1000,
                        ).toLocaleString("zh-CN")}
                        icon={Icon.Plus}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="修改时间"
                        text={new Date(
                          parseInt(item.updated) * 1000,
                        ).toLocaleString("zh-CN")}
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
                  <ActionPanel.Section title="查看操作">
                    <Action.OpenInBrowser
                      title="在思源中打开"
                      url={siyuanAPI.getDocUrl(
                        item.isDocument ? item.id : item.root_id || item.rootID,
                      )}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="复制操作">
                    <Action.CopyToClipboard
                      title="复制标题"
                      content={
                        item.isDocument ? item.content : item.doc_title || ""
                      }
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="复制内容"
                      content={item.markdown || item.content || ""}
                    />
                    <Action.CopyToClipboard title="复制id" content={item.id} />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="漫游操作">
                    <Action
                      title="重新漫游"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="返回配置"
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
          title="没有找到内容"
          description="请尝试调整漫游参数或检查思源笔记连接"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="返回配置"
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

// 主组件
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
