import { Action, ActionPanel, Detail, Form, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { detectLanguage } from "./textDetection";
import { AIModel, AvailableModels, SentenceTranslation, translateSentence } from "./backend";

export default function Command() {
  const [text, setText] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<AIModel>("Groq_GPT-OSS_20b");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push title="翻译" target={<TranslationDetail originalText={text} model={selectedModel} />} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="original"
        title="原文"
        placeholder="请输入或粘贴需要翻译的句子或段落，然后按下 ⌘⏎ 开始翻译"
        value={text}
        onChange={setText}
      />
      <Form.Dropdown
        id="model"
        title="选择模型"
        value={selectedModel}
        onChange={(v) => {
          setSelectedModel(v as AIModel);
        }}
      >
        {AvailableModels.map((model) => (
          <Form.Dropdown.Item key={model} value={model} title={model.replace(/_/g, " ")} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function TranslationDetail({ originalText, model }: { originalText: string; model: AIModel }) {
  const [state, setState] = useState<SentenceTranslation>({ original: originalText, translation: "", lang: "" });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    if (!originalText.trim() && !signal.aborted) {
      setIsLoading(false);
      setState({ original: originalText, translation: "", lang: "" });
      return;
    }
    setIsLoading(true);
    const lang = detectLanguage(originalText);
    translateSentence(
      originalText,
      lang,
      signal,
      (info) => {
        setState(info);
      },
      model,
    )
      .then((finalInfo) => {
        if (!signal.aborted) setState(finalInfo);
      })
      .catch((e) => {
        if (!signal.aborted) {
          showToast({
            title: "未知错误",
            message: e,
          }).then(() => {});
          setState({ original: originalText, translation: "", lang: "" });
        }
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [originalText]);

  const markdown = `${state.translation || ""}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="复制译文" content={state.translation || ""} />
        </ActionPanel>
      }
    />
  );
}
