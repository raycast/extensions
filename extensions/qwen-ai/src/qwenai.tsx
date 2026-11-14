import {
  Detail,
  ActionPanel,
  Action,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const SYSTEM_PROMPT =
  "你是通义千问(Qwen),由阿里巴巴集团开发的 AI 助手,通过阿里云百炼(DashScope)平台提供服务。当用户询问你的身份时,请如实回答。";

const STORAGE_KEY = "qwen-chat-history";

interface Preferences {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MD = "## 🤖 欢迎使用 Qwen AI\n\n按 **⌘K** 打开操作面板，选择「发送消息」开始对话。";

// ---------- 持久化(仅手动调用,不用 useEffect 监听) ----------
async function loadHistory(): Promise<Message[]> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // 忽略损坏数据
  }
  return [];
}

function saveHistory(msgs: Message[]) {
  // fire-and-forget,不 await,不在 useEffect 里调用
  LocalStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)).catch(() => {});
}

// ---------- Markdown 渲染(纯函数,移到组件外避免重建) ----------
function renderMarkdown(msgs: Message[]): string {
  if (msgs.length === 0) return WELCOME_MD;
  return msgs
    .map((m) => (m.role === "user" ? `### 🙋 我\n\n${m.content}` : `### 🤖 Qwen\n\n${m.content}`))
    .join("\n\n---\n\n");
}

// ---------- 输入表单 ----------
function MessageForm({ onSend }: { onSend: (text: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="发送"
            onSubmit={(values: { message: string }) => {
              if (values.message.trim()) {
                pop();
                onSend(values.message.trim());
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="消息" placeholder="输入你的问题..." autoFocus />
    </Form>
  );
}

// ---------- 主视图 ----------
export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [markdown, setMarkdown] = useState(WELCOME_MD);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { push } = useNavigation();

  // 消息用 ref 持有,不参与渲染触发,仅在需要时读/写
  const messagesRef = useRef<Message[]>([]);
  const streamBufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: preferences.apiKey,
        baseURL: preferences.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      }),
    [preferences.apiKey, preferences.baseUrl],
  );

  // 启动时恢复历史(只跑一次)
  useEffect(() => {
    loadHistory().then((msgs) => {
      messagesRef.current = msgs;
      if (msgs.length > 0) {
        setMarkdown(renderMarkdown(msgs));
      }
      setReady(true);
    });
  }, []);

  const handleSend = async (text: string) => {
    if (isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "" };
    const newMessages = [...messagesRef.current, userMsg, assistantMsg];
    messagesRef.current = newMessages;

    setIsLoading(true);
    streamBufferRef.current = "";
    setMarkdown(renderMarkdown(newMessages));

    try {
      const apiMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      ];

      const stream = await openai.chat.completions.create({
        model: preferences.model || "qwen-plus",
        messages: apiMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        streamBufferRef.current += chunk.choices?.[0]?.delta?.content || "";

        // 节流更新 markdown(唯一触发重渲染的 setState)
        if (timerRef.current === null) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            const updated = [...messagesRef.current];
            updated[updated.length - 1] = { role: "assistant", content: streamBufferRef.current };
            messagesRef.current = updated;
            setMarkdown(renderMarkdown(updated));
          }, 200);
        }
      }

      // 流结束:取消 pending timer,最终刷新 + 保存
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const finalMessages = [...messagesRef.current];
      finalMessages[finalMessages.length - 1] = { role: "assistant", content: streamBufferRef.current };
      messagesRef.current = finalMessages;
      setMarkdown(renderMarkdown(finalMessages));
      saveHistory(finalMessages); // ✅ 仅在对话结束时保存一次
    } catch (error) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      console.error("Qwen 请求失败:", error);
      const err = error as {
        status?: number;
        message?: string;
        error?: { message?: string; code?: string };
      };
      showToast({
        style: Toast.Style.Failure,
        title: err?.status ? `请求失败 (${err.status})` : "请求失败",
        message: err?.error?.message || err?.message || String(error),
      });
      const errorMsg = [...messagesRef.current];
      errorMsg[errorMsg.length - 1] = { role: "assistant", content: "❌ 请求出错，请检查配置或网络。" };
      messagesRef.current = errorMsg;
      setMarkdown(renderMarkdown(errorMsg));
      saveHistory(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    messagesRef.current = [];
    setMarkdown(WELCOME_MD);
    LocalStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  if (!ready) return <Detail isLoading markdown="" />;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="发送消息" onAction={() => push(<MessageForm onSend={handleSend} />)} />
          <Action title="清空对话" shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }} onAction={handleClear} />
        </ActionPanel>
      }
    />
  );
}
