import { Action, ActionPanel, Clipboard, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import capitalize from "capitalize";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getLoadActionSection } from "../actions/load";
import { readModelListCache } from "../hooks/model-cache";
import { ApiSettingsHook } from "../hooks/useApiSettings";
import { HistoryHook, Record } from "../hooks/useHistory";
import { useProxy } from "../hooks/useProxy";
import { QueryHook } from "../hooks/useQuery";
import { AppSettings } from "../runtime/app-settings";
import { getLangName, detectLang } from "../runtime/languages";
import { ToolMode } from "../runtime/types";
import { getErrorText } from "../runtime/http";
import { streamChatCompletions } from "../runtime/llm-client";
import { buildPromptMessages, buildToolVariables, ConversationMessage } from "../runtime/tool-runtime";
import { resolveToolModel, ToolSetting } from "../tool-settings";
import { ToolDefinition } from "../tools";
import { getToolIcon } from "../tool-icons";
import { DetailView } from "./detail";
import { EmptyView } from "./empty";
import { ToolSettingsForm } from "./tool-settings-form";

export interface ContentViewProps {
  query: QueryHook;
  history: HistoryHook;
  mode: ToolMode;
  setMode: (value: ToolMode) => void;
  activeTool: ToolDefinition;
  availableExecutionTools: ToolDefinition[];
  toolSetting: ToolSetting;
  updateToolSetting: (mode: ToolMode, patch: Partial<ToolSetting>) => Promise<void>;
  apiSettings: ApiSettingsHook;
  setSelectedId: (value: string) => void;
  setIsInit: (value: boolean) => void;
  setIsEmpty: (value: boolean) => void;
  appSettings: AppSettings;
}

export interface RuntimeQuery {
  text: string;
  detectFrom: string;
  detectTo: string;
  mode: ToolMode;
  toolTitle: string;
  model: string;
}

export interface Querying {
  hook: QueryHook;
  query: RuntimeQuery;
  id: string;
  controller: AbortController;
}

type ViewItem = Querying | Record;

function isQuerying(item: ViewItem): item is Querying {
  return "controller" in item;
}

type PendingToolRun = {
  mode: ToolMode;
  text: string;
  ocrImg?: string;
};

export const ContentView = (props: ContentViewProps) => {
  const {
    query,
    history,
    mode,
    setMode,
    activeTool,
    availableExecutionTools,
    toolSetting,
    updateToolSetting,
    apiSettings,
    setSelectedId,
    setIsInit,
    setIsEmpty,
    appSettings,
  } = props;
  const agent = useProxy(appSettings);
  const [data, setData] = useState<ViewItem[]>();
  const [querying, setQuerying] = useState<Querying | null>();
  const [resultText, setResultText] = useState("");
  const [showMetadata, setShowMetadata] = useState(appSettings.alwaysShowMetadata);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [pendingToolRun, setPendingToolRun] = useState<PendingToolRun | null>(null);

  useEffect(() => {
    setShowMetadata(appSettings.alwaysShowMetadata);
  }, [appSettings.alwaysShowMetadata]);

  function updateData() {
    if (history.data) {
      const sortedResults = history.data
        .filter((record) => record.mode === mode)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  async function copy2Clipboard(text: string) {
    await Clipboard.copy(text);
    await showToast({
      title: "Result copied to Clipboard",
      style: Toast.Style.Success,
    });
  }

  async function doQuery() {
    const cachedModels = await readModelListCache(apiSettings.data);
    const model = resolveToolModel(toolSetting) || apiSettings.data.validatedModel || cachedModels?.models[0]?.id || "";
    if (!model) {
      await showToast({
        title: "Model is required",
        message: "Open API Settings, load the model list, then validate and save.",
        style: Toast.Style.Failure,
      });
      query.updateQuerying(false);
      return;
    }

    if (!apiSettings.data.apiBase || !apiSettings.data.validatedAt) {
      await showToast({
        title: "Validate API settings first",
        message: "Open API Settings and pass the model list plus hi chat check.",
        style: Toast.Style.Failure,
      });
      query.updateQuerying(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const toast = await showToast({
      title: "Running AI tool...",
      style: Toast.Style.Animated,
    });

    const text = query.text;
    const detectFrom: string = query.from == "auto" ? (await detectLang(query.text)) ?? "en" : query.from;
    const detectTo = query.to;
    const img = query.ocrImage;
    const messages = buildPromptMessages({
      systemPrompt: "You are executing the {{toolName}} tool. Follow the tool prompt exactly.",
      userPrompt: toolSetting.prompt,
      variables: buildToolVariables({
        input: text,
        source: img ? "ocr" : "manual",
        sourceLang: getLangName(detectFrom),
        targetLang: getLangName(detectTo),
        toolName: activeTool.title,
        conversation,
      }),
      conversation,
      includeConversation: toolSetting.enableConversation,
    });

    const runtimeQuery: RuntimeQuery = {
      mode,
      text,
      detectFrom,
      detectTo,
      toolTitle: activeTool.title,
      model,
    };
    const activeQuerying: Querying = {
      hook: query,
      controller,
      query: runtimeQuery,
      id: "querying",
    };

    setResultText("");
    setQuerying(activeQuerying);
    query.updateText("");

    let output = "";
    try {
      for await (const delta of streamChatCompletions({
        settings: apiSettings.data,
        model,
        messages,
        signal,
        agent,
      })) {
        output += delta;
        setResultText(output);
      }

      if (appSettings.autoCopyToClipboard) {
        await copy2Clipboard(output);
      } else {
        toast.title = "AI result ready";
        toast.style = Toast.Style.Success;
      }

      const record: Record = {
        id: uuidv4(),
        mode,
        toolTitle: activeTool.title,
        created_at: new Date().toISOString(),
        result: {
          from: detectFrom,
          to: detectTo,
          original: text,
          text: output,
        },
        ocrImg: img,
        provider: `${apiSettings.data.apiCompatible} / ${model}`,
      };
      await history.add(record);
      if (toolSetting.enableConversation) {
        setConversation((current) => [
          ...current,
          { role: "user", content: text },
          { role: "assistant", content: output },
        ]);
      }
      query.updateQuerying(false);
    } catch (error) {
      if (signal.aborted) {
        toast.title = "Run cancelled";
        toast.style = Toast.Style.Success;
        query.updateQuerying(false);
        return;
      }
      const message = getErrorText(error);
      toast.title = "Error";
      toast.message = message;
      toast.style = Toast.Style.Failure;
      const record: Record = {
        id: uuidv4(),
        mode,
        toolTitle: activeTool.title,
        created_at: new Date().toISOString(),
        result: {
          from: detectFrom,
          to: detectTo,
          original: text,
          text: output,
          error: message,
        },
        ocrImg: img,
        provider: `${apiSettings.data.apiCompatible} / ${model}`,
      };
      await history.add(record);
      query.updateQuerying(false);
    }
  }

  useEffect(() => {
    if (query.querying && !querying) {
      doQuery();
    } else if (!query.querying && querying) {
      setQuerying(null);
    }
  }, [query.querying]);

  useEffect(() => {
    if (pendingToolRun && pendingToolRun.mode === mode && pendingToolRun.text === query.text && !query.querying) {
      query.updateQuerying(true);
      setPendingToolRun(null);
    }
  }, [pendingToolRun, mode, query.text, query.querying]);

  useEffect(() => {
    updateData();
  }, [history.data, querying, mode]);

  useEffect(() => {
    setIsEmpty(data == undefined || data.length == 0);
  }, [data]);

  const getQueryingActionPanel = () => (
    <ActionPanel>
      <Action
        title="Cancel Run"
        icon={Icon.Stop}
        shortcut={{ modifiers: ["ctrl"], key: "c" }}
        onAction={() => {
          if (querying) {
            querying.controller.abort();
          }
        }}
      />
    </ActionPanel>
  );

  const switchTool = async (tool: ToolDefinition, input?: { text?: string; ocrImg?: string; autoRun?: boolean }) => {
    if (!tool.mode) {
      return;
    }

    setMode(tool.mode);
    if (input?.text) {
      await query.updateText(input.text);
      await query.updateOcr(input.ocrImg);
      if (input.autoRun) {
        setPendingToolRun({ mode: tool.mode, text: input.text, ocrImg: input.ocrImg });
      }
    }
  };

  function toolActionTitle(tool: ToolDefinition, input?: { text?: string; autoRun?: boolean }) {
    if (input?.text && input.autoRun) {
      return `Run Original with ${tool.title}`;
    }
    if (input?.text) {
      return `Open Original in ${tool.title}`;
    }
    return `Switch to ${tool.title}`;
  }

  function toolActionSectionTitle(input?: { text?: string; autoRun?: boolean }) {
    if (input?.text && input.autoRun) {
      return "Run Original With Tool";
    }
    if (input?.text) {
      return "Open Original With Tool";
    }
    return "Switch Tool";
  }

  const getToolActionSection = (input?: { text?: string; ocrImg?: string; autoRun?: boolean }) => (
    <ActionPanel.Submenu
      title={toolActionSectionTitle(input)}
      icon={Icon.CommandSymbol}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
    >
      {availableExecutionTools.map((tool) => {
        const icon = getToolIcon(tool);
        return (
          <Action
            title={toolActionTitle(tool, input)}
            icon={icon}
            key={tool.id}
            autoFocus={tool.mode === mode}
            onAction={() => switchTool(tool, input)}
          />
        );
      })}
    </ActionPanel.Submenu>
  );

  const getCommonActions = (input?: { text?: string; ocrImg?: string; autoRun?: boolean }) => (
    <>
      {query.text && (
        <Action
          title={toolSetting.enableConversation && conversation.length > 0 ? "Continue Conversation" : activeTool.title}
          icon={Icon.Book}
          onAction={() => query.updateQuerying(true)}
        />
      )}
      <Action
        title={`Control ${query.langType == "To" ? "Source" : "Output"} Language`}
        icon={Icon.Switch}
        onAction={() => {
          query.updateLangType(query.langType == "To" ? "From" : "To");
        }}
      />
      {getToolActionSection(input)}
      <Action.Push
        title="Tool Settings"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        target={<ToolSettingsForm tool={activeTool} setting={toolSetting} onSave={updateToolSetting} />}
      />
    </>
  );

  const currentToolHistoryCount = history.data?.filter((record) => record.mode === mode).length ?? 0;

  function formatModeTitle(mode: ToolMode) {
    if (mode.startsWith("custom:")) {
      return capitalize(mode.slice("custom:".length).replaceAll("-", " "));
    }
    return capitalize(mode);
  }

  const getRecordToolTitle = (record: Record) =>
    record.toolTitle ??
    availableExecutionTools.find((tool) => tool.mode === record.mode)?.title ??
    formatModeTitle(record.mode);

  const getRecordActionPanel = (record: Record) => (
    <ActionPanel>
      {getCommonActions({ text: record.result.original, ocrImg: record.ocrImg, autoRun: true })}
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Result"
          content={record.result.text ?? ""}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard
          title="Copy Original"
          content={record.result.original ?? ""}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      {getLoadActionSection(record, (str) => {
        query.updateText(str);
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
        {toolSetting.enableConversation && conversation.length > 0 && (
          <Action
            title="Clear Conversation"
            icon={Icon.XmarkCircle}
            onAction={() => {
              setConversation([]);
            }}
          />
        )}
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
        <Action
          title="Clear History"
          icon={Icon.DeleteDocument}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Clear History?",
                message: `${currentToolHistoryCount} ${activeTool.title} items will be removed.`,
              })
            ) {
              history.clearMode(mode);
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return data == undefined ? null : data.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section
      title={toolSetting.enableConversation ? "Results & Conversation" : "History"}
      subtitle={currentToolHistoryCount.toLocaleString()}
    >
      {data?.map((item, i) => {
        return isQuerying(item) ? (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.query.text}
            subtitle="Generating..."
            accessories={[{ text: item.query.toolTitle }, { text: item.query.model }]}
            actions={getQueryingActionPanel()}
            detail={
              <DetailView
                showMetadata={showMetadata}
                text={resultText}
                isLoading={resultText.length === 0}
                original={item.query.text}
                from={item.query.detectFrom}
                mode={item.query.mode}
                toolTitle={item.query.toolTitle}
                ocrImg={query.ocrImage}
                to={item.query.detectTo}
                provider={item.query.model}
              />
            }
          />
        ) : (
          <List.Item
            id={item.id}
            key={item.id}
            title={item.result.original}
            subtitle={item.result.error || item.result.text}
            accessories={[{ text: item.result.error ? "Error" : getRecordToolTitle(item) }, { text: `#${i}` }]}
            actions={getRecordActionPanel(item)}
            detail={
              <DetailView
                showMetadata={showMetadata}
                text={item.result.text}
                error={item.result.error}
                original={item.result.original}
                from={item.result.from}
                to={item.result.to}
                mode={item.mode}
                toolTitle={getRecordToolTitle(item)}
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
