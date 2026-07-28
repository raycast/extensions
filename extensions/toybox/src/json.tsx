/**
 * JSON 查看器命令。
 *
 * 启动时尝试把剪贴板内容当作 JSON 解析：
 * - 成功 → 直接 push 到 JsonNodePage 的根节点，无需用户交互。
 * - 失败 / 抛错 / 为空 → 回退到 JsonInputForm。
 */

import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Form, showToast, Toast, useNavigation } from "@raycast/api";

import { JsonNodePage } from "./components/JsonNodePage";
import { buildNode, parseJson } from "./json-viewer/jsonParser";

/** 加载态时 Detail 视图展示的占位文案。 */
const LOADING_MARKDOWN = "正在读取剪贴板…";

/**
 * 命令挂载时剪贴板读取的状态机。
 * - loading：首次渲染时尚未读到结果。
 * - ready(value)：读取完成。
 * - error(message)：读取抛错。
 */
type ClipboardState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: string }
  | { readonly status: "error"; readonly message: string };

/**
 * 命令入口。渲染状态由 ClipboardState 决定：
 * - loading → loading Detail；
 * - ready + 合法 JSON → 立刻 push 到树根；
 * - ready + 非法 JSON / 空 → 渲染 Form；
 * - error → 渲染 Form + Toast。
 */
export default function Command() {
  const navigation = useNavigation();
  const [clipboard, setClipboard] = useState<ClipboardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await Clipboard.readText();
        if (!cancelled) {
          setClipboard({ status: "ready", value: text ?? "" });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setClipboard({ status: "error", message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (clipboard.status !== "ready") {
      return;
    }
    const trimmed = clipboard.value.trim();
    if (!trimmed) {
      return;
    }
    const result = parseJson(trimmed);
    if (result.kind !== "ok") {
      return;
    }
    const root = buildNode(result.value, {
      key: "root",
      indexKey: "root",
      parentPath: "$",
      parentType: "root",
    });
    navigation.push(<JsonNodePage node={root} root={root} />);
  }, [clipboard, navigation]);

  useEffect(() => {
    if (clipboard.status === "error") {
      void showToast({
        style: Toast.Style.Failure,
        title: "无法读取剪贴板",
        message: clipboard.message,
      });
    }
  }, [clipboard]);

  if (clipboard.status === "loading") {
    return <Detail isLoading markdown={LOADING_MARKDOWN} />;
  }

  const seed = clipboard.status === "ready" ? clipboard.value : "";
  return <JsonInputForm initialValue={seed} />;
}

/** JsonInputForm 的 props。 */
interface JsonInputFormProps {
  /** TextArea 默认值；通常来自剪贴板原始文本。 */
  readonly initialValue: string;
}

/**
 * 手动输入 Form：剪贴板智能识别失败时的兜底入口。
 *
 * 提交时调用 parseJson 校验：成功 → 推送到 JsonNodePage，
 * 失败 → 推送到 JsonErrorPage。
 */
function JsonInputForm({ initialValue }: JsonInputFormProps) {
  const navigation = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="View JSON"
            onSubmit={(values) => {
              const text = (values.content ?? "").toString();
              const result = parseJson(text);
              if (result.kind === "error") {
                navigation.push(<JsonErrorPage message={result.message} original={text} />);
                return;
              }
              const root = buildNode(result.value, {
                key: "root",
                indexKey: "root",
                parentPath: "$",
                parentType: "root",
              });
              navigation.push(<JsonNodePage node={root} root={root} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="JSON 内容"
        placeholder='{\n  "hello": "world"\n}'
        defaultValue={initialValue}
        enableMarkdown={false}
      />
      <Form.Description
        title="提示"
        text="粘贴或输入任意 JSON 文本，提交后进入树形浏览页。支持对象 / 数组懒加载下钻与 Primitive 详情查看。"
      />
    </Form>
  );
}

interface JsonErrorPageProps {
  readonly message: string;
  readonly original: string;
}

/**
 * 解析失败页：以 Detail 视图展示错误信息与原始输入，并提供「返回编辑」Action 回到输入表单。
 */
function JsonErrorPage({ message, original }: JsonErrorPageProps) {
  const navigation = useNavigation();
  const trimmed = original.trim();
  const body = trimmed ? (trimmed.length > 4000 ? trimmed.slice(0, 4000) + "\n…（已截断）" : trimmed) : "（空）";
  const backtick = String.fromCharCode(96);
  const fence = backtick + backtick + backtick;
  const markdown = [
    "## 解析失败",
    "",
    fence + "text",
    message,
    fence,
    "",
    "### 原始输入",
    "",
    fence + "text",
    body,
    fence,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="返回编辑"
            onAction={() => {
              navigation.pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
