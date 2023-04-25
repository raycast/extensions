import {
  Action,
  ActionPanel,
  Alert,
  clearSearchBar,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { DetailView } from "./detail";
import { EmptyView } from "./empty";
import { translate, TranslateMode, TranslateQuery } from "../providers/openai/translate";
import { QueryHook } from "../hooks/useQuery";
import { useProxy } from "../hooks/useProxy";
import { useHistory, Record, HistoryHook } from "../hooks/useHistory";
import { useEffect, useRef, useState } from "react";
import { detectLang } from "../providers/openai/lang";
import { v4 as uuidv4 } from "uuid";
import capitalize from "capitalize";
import { getLoadActionSection } from "../actions/load";
import { getModeActionSection } from "../actions/mode";

export interface ContentViewProps {
  query: QueryHook;
  history: HistoryHook;
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

export const ContentView = (props: ContentViewProps) => {
  const { query, history, mode, setMode, setSelectedId, setIsInit, setIsEmpty } = props;
  const agent = useProxy();
  const [data, setData] = useState<ViewItem[]>();
  const [querying, setQuerying] = useState<Querying | null>();
  const [translatedText, setTranslatedText] = useState("");
  const { entrypoint, apikey, apiModel } = getPreferenceValues<{
    entrypoint: string;
    apikey: string;
    apiModel: string;
  }>();
  const ref = useRef<string>();
  function updateData() {
    if (history.data) {
      const sortedResults = history.data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

  function onTranslationError(toast: Toast, from: string, title: string, message: string, img: string | undefined) {
    (toast.title = title), (toast.message = message);
    toast.style = Toast.Style.Failure;
    const record: Record = {
      id: uuidv4(),
      mode,
      created_at: new Date().toISOString(),
      result: {
        from,
        to: query.to,
        original: query.text,
        text: ref.current ?? "",
        error: message,
      },
      ocrImg: img,
    };
    history.add(record);
    query.updateQuerying(false);
  }

  async function doQuery() {
    const controller = new AbortController();
    const { signal } = controller;
    const detectFrom: string = query.from == "auto" ? (await detectLang(query.text)) ?? "en" : query.from;
    const toast = await showToast({
      title: "Getting your translation...",
      style: Toast.Style.Animated,
    });
    const text = query.text;
    const detectTo = query.to;
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
        onMessage: (message) => {
          if (message.role) {
            return;
          }
          setTranslatedText((translatedText) => {
            return translatedText + message.content;
          });
        },
        onFinish: (reason) => {
          toast.title = "Got your translation!";
          toast.style = Toast.Style.Success;
          if (reason !== "stop") {
            onTranslationError(toast, detectFrom, "Error", `failed：${reason}`, img);
          } else {
            if (ref.current) {
              const newText =
                ["”", '"', "」"].indexOf(ref.current[ref.current.length - 1]) >= 0 // FIXME 避免显性引用
                  ? ref.current.slice(0, -1)
                  : ref.current;
              setTranslatedText(newText);

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
              };
              history.add(record);
            }
            query.updateQuerying(false);
          }
        },
        onError: (error) => {
          onTranslationError(toast, detectFrom, "Error", error, img);
        },
      },
      id: "querying",
    };
    setTranslatedText("");
    setQuerying(_querying);
    query.updateText("");
    translate(_querying.query, entrypoint, apikey, apiModel);
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
    ref.current = translatedText;
  }, [translatedText]);

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
      <ActionPanel.Section title="History">
        <Action
          title="Delete Item"
          icon={Icon.Trash}
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
            accessories={[{ text: `#${i + 1}` }]}
            actions={getQueryingActionPanel()}
            detail={
              <DetailView
                text={translatedText}
                original={querying ? querying.query.text : ""}
                from={querying ? querying.query.detectFrom : "auto"}
                mode={querying ? querying.query.mode : "translate"}
                ocrImg={query.ocrImage}
                to={query.to}
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
                text={item.result.text}
                original={item.result.original}
                from={item.result.from}
                to={item.result.to}
                mode={item.mode}
                created_at={item.created_at}
                ocrImg={item.ocrImg}
              />
            }
          />
        );
      })}
    </List.Section>
  );
};
