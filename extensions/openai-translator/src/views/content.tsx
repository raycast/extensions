import {
  Action,
  ActionPanel,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import capitalize from "capitalize";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getLoadActionSection } from "../actions/load";
import { getModeActionSection } from "../actions/mode";
import { HistoryHook, Record } from "../hooks/useHistory";
import { useProxy } from "../hooks/useProxy";
import { QueryHook } from "../hooks/useQuery";
import { detectLang } from "../providers/lang";
import { TranslateMode, TranslateQuery } from "../providers/types";
import { DetailView } from "./detail";
import { EmptyView } from "./empty";
import { getErrorText } from "../providers/utils";
import { Provider } from "../providers/base";
import { getProviderActionSection } from "../actions/provider";
import { ProvidersHook } from "../hooks/useProvider";
import { createProvider } from "../providers";

export interface ContentViewProps {
  query: QueryHook;
  history: HistoryHook;
  provider: Provider;
  providerHook: ProvidersHook | null;
  mode: TranslateMode;
  setMode: (value: TranslateMode) => void;
  setSelectedId: (value: string) => void;
  setIsInit: (value: boolean) => void;
  setIsEmpty: (value: boolean) => void;
}

export interface Querying {
  hook: QueryHook;
  query: TranslateQuery;
  id: string;
  controller: AbortController;
}

type ViewItem = Querying | Record;

type FinishReason = {
  reason: string;
  error: string | undefined;
  toast: Toast;
  detectFrom: string;
  detectTo: string;
  text: string;
  img: string | undefined;
};

const { alwayShowMetadata } = getPreferenceValues<{
  alwayShowMetadata: boolean;
}>();

const { isAutoCopy2Clipboard } = getPreferenceValues<{
  isAutoCopy2Clipboard: boolean;
}>();

export const ContentView = (props: ContentViewProps) => {
  const { query, history, provider, providerHook, mode, setMode, setSelectedId, setIsInit, setIsEmpty } = props;
  const agent = useProxy();
  const [data, setData] = useState<ViewItem[]>();
  const [querying, setQuerying] = useState<Querying | null>();
  const [finishReason, setFinishReason] = useState<FinishReason | null>();
  const [translatedText, setTranslatedText] = useState("");
  const [showMetadata, setShowMetadata] = useState(alwayShowMetadata);
  const [activeRecord, setActiveRecord] = useState({ provider, id: providerHook?.selected?.id });
  const activeProvider = activeRecord.provider;
  function updateData() {
    if (history.data) {
      const sortedResults = history.data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      if (querying == null) {
        setData(sortedResults);
        if (sortedResults.length > 0) {
          setSelectedId(sortedResults[0].id);
        }
        setIsInit(false);
      } else {
        setData([querying, ...sortedResults]);
        setSelectedId("querying");
        setIsInit(false);
      }
    }
  }

  function onTranslationError(finishReason: FinishReason) {
    const { error, toast, detectFrom, detectTo, text, img } = finishReason;
    const message = error;
    toast.title = "Error";
    toast.message = message;
    toast.style = Toast.Style.Failure;
    const record: Record = {
      id: uuidv4(),
      mode,
      created_at: new Date().toISOString(),
      result: {
        from: detectFrom,
        to: detectTo,
        original: text,
        text: translatedText,
        error: message,
      },
      ocrImg: img,
      provider: activeProvider.name,
    };
    history.add(record);
    setFinishReason(null);
    query.updateQuerying(false);
  }

  async function copy2Clipboard(text: string) {
    await Clipboard.copy(text);
    await showToast({
      title: "Translation copied to Clipboard",
      style: Toast.Style.Success,
    });
  }

  function onTranslationStop(finishReason: FinishReason) {
    const { toast, detectFrom, detectTo, text, img } = finishReason;
    const txt = translatedText;
    const newText = ["”", '"', "」"].indexOf(txt[txt.length - 1]) >= 0 ? txt.slice(0, -1) : txt;
    setTranslatedText(newText);
    if (isAutoCopy2Clipboard) {
      copy2Clipboard(newText);
    } else {
      toast.title = "Got your translation!";
      toast.style = Toast.Style.Success;
    }
    const record: Record = {
      id: uuidv4(),
      mode,
      created_at: new Date().toISOString(),
      result: {
        from: detectFrom,
        to: detectTo,
        original: text,
        text: newText,
      },
      ocrImg: img,
      provider: activeProvider.name,
    };
    history.add(record);
    setFinishReason(null);
    query.updateQuerying(false);
  }

  useEffect(() => {
    if (finishReason) {
      const { reason } = finishReason;
      if (reason !== "stop") {
        onTranslationError(finishReason);
      } else {
        onTranslationStop(finishReason);
      }
    }
  }, [finishReason]);

  async function doQuery() {
    const controller = new AbortController();
    const { signal } = controller;
    const toast = await showToast({
      title: "Getting your translation...",
      style: Toast.Style.Animated,
    });

    const text = query.text;
    const detectFrom: string = query.from == "auto" ? (await detectLang(query.text)) ?? "en" : query.from;

    // 检测语言为中文且目标语言为中文时，自动翻译为英文
    const detectTo =
      mode == "translate" && detectFrom == query.to && (query.to == "zh-Hans" || query.to == "zh-Hans")
        ? "en"
        : query.to;

    const img = query.ocrImage;

    const _querying: Querying = {
      hook: query,
      controller,
      query: {
        mode,
        signal,
        agent,
        text,
        detectFrom,
        detectTo,
      },
      id: "querying",
    };
    setTranslatedText("");
    setQuerying(_querying);
    query.updateText("");
    try {
      const translationStream = activeProvider.translate(_querying.query);
      for await (const message of translationStream) {
        // console.debug("=====ui====");
        // console.debug(message);
        if (typeof message === "string") {
          setFinishReason({
            reason: message,
            error: `failed: ${message}`,
            toast,
            detectFrom,
            detectTo,
            text,
            img,
          });
          return;
        } else {
          // if (message.role) {
          //   continue;
          // }
          // setIsWordMode(message.isWordMode)
          setTranslatedText((txt) => {
            if (message.isFullText) {
              return message.content;
            }
            return txt + message.content;
          });
        }
      }
    } catch (error) {
      console.error(error);
      setFinishReason({
        reason: "error",
        error: getErrorText(error),
        toast,
        detectFrom,
        detectTo,
        text,
        img,
      });
    }
  }

  useEffect(() => {
    if (query.querying && !querying) {
      doQuery();
    } else if (!query.querying) {
      if (querying) {
        setQuerying(null);
      }
    }
  }, [query.querying]);

  useEffect(() => {
    updateData();
  }, [history.data, querying]);

  useEffect(() => {
    setIsEmpty(data == undefined || data.length == 0);
  });

  const getQueryingActionPanel = () => (
    <ActionPanel>
      <ActionPanel.Submenu title="Cancel">
        <Action
          title="Abort"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
          onAction={() => {
            if (querying) {
              querying.controller.abort();
            }
          }}
        />
      </ActionPanel.Submenu>
    </ActionPanel>
  );

  const getRecordActionPanel = (record: Record) => (
    <ActionPanel>
      {query.text && <Action title={capitalize(mode)} icon={Icon.Book} onAction={() => query.updateQuerying(true)} />}
      <Action
        title={`Switch to Translate ${query.langType == "To" ? "From" : "To"}`}
        icon={Icon.Switch}
        onAction={() => {
          query.updateLangType(query.langType == "To" ? "From" : "To");
        }}
      />
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Translation"
          content={record.result.text ?? ""}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Original"
          content={record.result.original ?? ""}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      {getLoadActionSection(record, (str) => {
        query.updateText(str);
      })}
      {getModeActionSection((mode) => {
        setMode(mode);
      })}
      {providerHook &&
        getProviderActionSection(providerHook, activeRecord.id, (record) => {
          setActiveRecord({
            provider: createProvider(record.type, record.props),
            id: record.id,
          });
        })}
      <ActionPanel.Section title="Options">
        <Action
          title={showMetadata ? "Hide Metadata" : "Show Metadata"}
          icon={showMetadata ? Icon.EyeSlash : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "m" }}
          onAction={() => {
            setShowMetadata(!showMetadata);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="History">
        <Action
          title="Delete Item"
          icon={{ source: Icon.Trash, tintColor: "red" }}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Remove Item?",
              })
            ) {
              history.remove(record);
            }
          }}
        />
        {
          <Action
            title="Clear History"
            icon={Icon.DeleteDocument}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Clear History?",
                  message: `${history.data?.length} items will be removed.`,
                })
              ) {
                history.clear();
              }
            }}
          />
        }
      </ActionPanel.Section>
    </ActionPanel>
  );

  return data == undefined ? null : data.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section title="History" subtitle={history.data?.length.toLocaleString()}>
      {data?.map((item, i) => {
        return "query" in item ? (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.query.text}
            accessories={[{ text: `#${i}` }]}
            actions={getQueryingActionPanel()}
            detail={
              <DetailView
                showMetadata={showMetadata}
                text={translatedText}
                original={querying ? querying.query.text : ""}
                from={querying ? querying.query.detectFrom : "auto"}
                mode={querying ? querying.query.mode : "translate"}
                ocrImg={query.ocrImage}
                to={query.to}
                provider={activeProvider.name}
              />
            }
          />
        ) : (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.result.original}
            accessories={[{ text: `#${i}` }]}
            actions={getRecordActionPanel(item)}
            detail={
              <DetailView
                showMetadata={showMetadata}
                text={item.result.text}
                original={item.result.original}
                from={item.result.from}
                to={item.result.to}
                mode={item.mode}
                created_at={item.created_at}
                ocrImg={item.ocrImg}
                provider={item.provider}
              />
            }
          />
        );
      })}
    </List.Section>
  );
};
