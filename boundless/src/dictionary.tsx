import { Icon, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { detectLanguage } from "./textDetection";
import { AIModel, AvailableModels, queryWord, translateWord, translateWordInfo, WordInfo } from "./backend";
import { QueryWordListItem, TranslateListItem } from "./components";
import { useDebounce } from "./hook";

export default function DictionaryCommand() {
  const [text, setText] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<AIModel>("Groq_GPT-OSS_20b");
  const textDebounce = useDebounce<string>(text, 1000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<"queryWord" | "translateWord" | "">("");
  const [wordInfo, setWordInfo] = useState<WordInfo>({ word: "", pronunciation: "", decomp: "", definitions: [] });
  const [candidates, setCandidates] = useState<translateWordInfo[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const value = textDebounce.trim();
    if (!value && !signal.aborted) {
      setMode("");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const lang = detectLanguage(value);
    if (lang === "en") {
      queryWord(value, signal, selectedModel)
        .then((info) => {
          if (!signal.aborted) {
            setWordInfo(info);
            setMode("queryWord");
          }
        })
        .catch((e) => {
          if (!signal.aborted) {
            showToast({
              title: "未知错误",
              message: e,
            }).then(() => {});
            setMode("");
          }
        })
        .finally(() => {
          if (!signal.aborted) setIsLoading(false);
        });
    } else {
      translateWord(value, signal, selectedModel)
        .then((info) => {
          if (!signal.aborted) {
            setCandidates(info);
            setMode("translateWord");
          }
        })
        .catch((e) => {
          if (!signal.aborted) {
            showToast({
              title: "未知错误",
              message: e,
            }).then(() => {});
            setMode("");
          }
        })
        .finally(() => {
          if (!signal.aborted) setIsLoading(false);
        });
    }

    return () => {
      controller.abort();
    };
  }, [textDebounce]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="输入英文或中文单词以查询/翻译"
      onSearchTextChange={setText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="选择模型"
          value={selectedModel}
          onChange={(v) => {
            setSelectedModel(v as AIModel);
          }}
        >
          {AvailableModels.map((model) => (
            <List.Dropdown.Item key={model} value={model} title={model.replace(/_/g, " ")} />
          ))}
        </List.Dropdown>
      }
    >
      {mode === "queryWord" &&
        wordInfo.definitions.map((definition, index) => (
          <QueryWordListItem key={`word-${index}`} item={wordInfo} definition={definition} />
        ))}

      {mode === "translateWord" &&
        candidates.map((item, index) => <TranslateListItem key={`trans-${index}`} item={item} />)}

      {mode === "" && <List.EmptyView title="请输入要查询的单词" icon={Icon.MagnifyingGlass} />}
    </List>
  );
}
