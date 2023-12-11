import { ChainPreferences, Chains, OllamaApiGenerateResponse, OllamaApiShowModelfile } from "../types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorRaycastModelNotConfiguredOnLocalStorage,
} from "../errors";
import { OllamaApiShow, OllamaApiShowParseModelfile } from "../ollama";
import { SetModelView } from "./SetModelView";
import * as React from "react";
import { Action, ActionPanel, Detail, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { SaveChatView } from "./SaveChatView";
import { ChainView } from "./ChainView";
import { DocumentLoaderFileView } from "./DocumentLoaderFileView";
import { GetDocument, GetTags, LLMChain, loadQARefineChain, loadQAStuffChain } from "../langchain";
import { Document } from "langchain/document";
import { EventEmitter } from "stream";

const preferences = getPreferenceValues();

/**
 * Return JSX element for chat view.
 * @returns {JSX.Element} Raycast Chat View.
 */
export function ChatView(): JSX.Element {
  const { data: ModelGenerate, revalidate: RevalidateModelGenerate } = usePromise(GetModel, [], {
    onData: () => {
      RevalidateModelGenerateModelfile();
    },
    onError: () => {
      setShowSelectModelForm(true);
    },
  });
  const { data: ModelGenerateModelfile, revalidate: RevalidateModelGenerateModelfile } = usePromise(GetModelModfile);
  const { data: ModelEmbedding, revalidate: RevalidateModelEmbedding } = usePromise(GetModelEmbedding);
  const { data: ChainPreferences, revalidate: RevalidateChainPreferences } = usePromise(GetChainPreferences);
  const { data: ChatName = "Current", revalidate: RevalidateChatName } = usePromise(GetChatName);
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [query, setQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [selectedAnswer, setSelectedAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("0");
  const [answerListHistory, setAnswerListHistory]: [
    Map<string, [string, string, OllamaApiGenerateResponse][] | undefined>,
    React.Dispatch<React.SetStateAction<Map<string, [string, string, OllamaApiGenerateResponse][] | undefined>>>
  ] = React.useState(new Map());
  const [clipboardConversation, setClipboardConversation]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("");

  /**
   * Handle Error from Ollama API.
   * @param {Error} err - Error object.
   * @returns {Promise<void>}
   */
  async function HandleError(err: Error) {
    if (err instanceof ErrorOllamaModelNotInstalled) {
      await showToast({ style: Toast.Style.Failure, title: err.message, message: err.suggest });
      setLoading(false);
      setShowSelectModelForm(true);
      return;
    } else if (err instanceof ErrorOllamaCustomModel) {
      await showToast({
        style: Toast.Style.Failure,
        title: err.message,
        message: `Model: ${err.model}, File: ${err.file}`,
      });
      setLoading(false);
      return;
    } else {
      await showToast({ style: Toast.Style.Failure, title: err.message });
      setLoading(false);
    }
  }

  /**
   * Get Model from LocalStorage.
   * @returns {Promise<string>} Model.
   */
  async function GetModel(): Promise<string> {
    const m = await LocalStorage.getItem(`chat_model_generate`);
    if (m) {
      return m as string;
    } else {
      throw ErrorRaycastModelNotConfiguredOnLocalStorage;
    }
  }

  /**
   * Get Model Modelfile parameters.
   * @returns {OllamaApiShowModelfile | undefined} Modelfile parameters.
   */
  async function GetModelModfile(): Promise<OllamaApiShowModelfile | undefined> {
    const model = await LocalStorage.getItem(`chat_model_generate`);
    if (model) {
      return await OllamaApiShow(model as string)
        .then(async (data) => await OllamaApiShowParseModelfile(data))
        .catch(() => undefined);
    } else {
      return undefined;
    }
  }

  /**
   * Get Model for Embedding from LocalStorage.
   * @returns {Promise<string | undefined>} Model.
   */
  async function GetModelEmbedding(): Promise<string | undefined> {
    return await LocalStorage.getItem(`chat_model_embedding`);
  }

  /**
   * Get Chain Preferences.
   * @returns {Promise<ChainSettings | undefined>} Chain Settings.
   */
  async function GetChainPreferences(): Promise<ChainPreferences | undefined> {
    const json = await LocalStorage.getItem(`chain_settings`);
    if (json) {
      return JSON.parse(json as string) as ChainPreferences;
    }
  }

  /**
   * Start Inference with Ollama API.
   * @returns {Promise<void>}
   */
  async function Inference(): Promise<void> {
    try {
      const [prompt, tags] = GetTags(query);

      setLoading(true);
      setQuery("");

      let docs: Document<Record<string, any>>[] | undefined = undefined;

      if (tags.length > 0) {
        await showToast({ style: Toast.Style.Animated, title: "📄 Loading Documents." });

        let model = ModelGenerate;
        if (ModelEmbedding) model = ModelEmbedding;

        let DocsNumber: number | undefined;
        if (ModelGenerateModelfile)
          if (ChainPreferences === undefined || ChainPreferences.type === Chains.STUFF) {
            DocsNumber = Math.trunc(
              ((ModelGenerateModelfile.parameter.num_ctx * 4 - prompt.length - ModelGenerateModelfile.template.length) /
                1000) *
                0.5
            );
            if (model) docs = await GetDocument(prompt, model, tags, DocsNumber);
          } else if (ChainPreferences.type === Chains.REFINE && ChainPreferences.parameter?.docsNumber) {
            DocsNumber = ChainPreferences.parameter.docsNumber;
            if (model)
              docs = await GetDocument(prompt, model, tags, DocsNumber, ModelGenerateModelfile.parameter.num_ctx * 3.5);
          }
      }

      let context: number[] | undefined;
      if (answerListHistory.has(ChatName)) {
        const l = answerListHistory.get(ChatName)?.length;
        if (l && l > 0) {
          context = answerListHistory.get(ChatName)?.[l - 1][2].context;
        }
      }

      let stream: EventEmitter | undefined;
      if (docs) {
        if (ChainPreferences === undefined || ChainPreferences.type === Chains.STUFF) {
          await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents." });
          if (ModelGenerate) stream = await loadQAStuffChain(prompt, ModelGenerate, docs, context);
        } else if (ChainPreferences.type === Chains.REFINE) {
          await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents." });
          if (ModelGenerate) stream = await loadQARefineChain(prompt, ModelGenerate, docs, context);
        }
      } else {
        await showToast({ style: Toast.Style.Animated, title: "🧠 Inference." });
        if (ModelGenerate) stream = await LLMChain(prompt, ModelGenerate, context);
      }

      if (stream) {
        setAnswerListHistory((prevState) => {
          let prevData = prevState.get(ChatName);
          if (prevData?.length === undefined) {
            prevData = [[query, "", {} as OllamaApiGenerateResponse]];
          } else {
            prevData.push([query, "", {} as OllamaApiGenerateResponse]);
          }
          prevState.set(ChatName, prevData);
          setSelectedAnswer((prevData.length - 1).toString());
          return new Map(prevState);
        });

        stream.on("data", (data) => {
          setAnswerListHistory((prevState) => {
            const prevData = prevState.get(ChatName);
            if (prevData) {
              if (prevData?.length) prevData[prevData.length - 1][1] += data;
              prevState.set(ChatName, prevData);
            }
            return new Map(prevState);
          });
        });

        stream.on("done", async (data) => {
          await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
          setAnswerListHistory((prevState) => {
            const prevData = prevState.get(ChatName);
            if (prevData) {
              if (prevData?.length) prevData[prevData.length - 1][2] = data;
              prevState.set(ChatName, prevData);
            }
            return new Map(prevState);
          });
          setLoading(false);
        });
      } else {
        await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
        setLoading(false);
      }
    } catch (err) {
      await HandleError(err as Error);
    }
  }

  /**
   * Save Answer List History to LocalStorage
   */
  async function SaveAnswerListHistory(): Promise<void> {
    const currentData = answerListHistory.get(ChatName);
    if (currentData && currentData[currentData.length - 1][2].context) {
      await LocalStorage.setItem("answerListHistory", JSON.stringify([...answerListHistory]));
    }
  }

  /**
   * Get Last Chat used from LocalStorage.
   * @returns {Promise<string>} Chat Name
   */
  async function GetChatName(): Promise<string> {
    const name = await LocalStorage.getItem("chatName");
    if (name) {
      return name as string;
    } else {
      return "Current";
    }
  }

  /**
   * Get Answer List History from LocalStorage.
   * @returns {Promise<Map<string, [string, string, OllamaApiGenerateResponse][]>>}
   */
  async function GetAnswerListHistory(): Promise<Map<string, [string, string, OllamaApiGenerateResponse][]>> {
    const data = await LocalStorage.getItem("answerListHistory");
    if (data) {
      const dataMap: Map<string, [string, string, OllamaApiGenerateResponse][]> = new Map(JSON.parse(data as string));
      return dataMap;
    }
    return new Map();
  }

  /**
   * Clear Chat
   * @return {Promise<void>}
   */
  async function ClearAnswerList(): Promise<void> {
    setAnswerListHistory((prevState) => {
      if (ChatName === "Current") {
        prevState.set("Current", undefined);
      } else {
        prevState.delete(ChatName);
      }
      return new Map(prevState);
    });
    if (answerListHistory.size === 0) {
      await LocalStorage.removeItem("answerListHistory");
    }
    await LocalStorage.setItem("chatName", "Current");
    await LocalStorage.setItem("answerListHistory", JSON.stringify([...answerListHistory]));
    await RevalidateChatName();
  }

  /**
   * Change Chat Name and save to LocalStorage
   * @param {string} name - Chat Name
   * @return {Promise<void>}
   */
  async function ChangeChat(name: string): Promise<void> {
    setClipboardConversationByName(name);
    await LocalStorage.setItem("chatName", name);
    await RevalidateChatName();
  }

  /**
   * Set Clipboard
   * @param {string} name - Chat Name
   * @returns {void}
   */
  function setClipboardConversationByName(name: string): void {
    let clipboard = "";
    const data = answerListHistory.get(name);
    if (data) {
      data.map((value) => (clipboard += `Question:\n${value[0]}\n\nAnswer:${value[1]}\n\n`));
    }
    setClipboardConversation(clipboard);
  }

  // Save AnswerListHistory to LocalStorage on Change
  React.useEffect(() => {
    SaveAnswerListHistory();
  }, [answerListHistory]);

  // Form: SaveChatView
  const [showFormSaveChat, setShowFormSaveChat]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  // Form: SetModelView
  const [showSelectModelForm, setShowSelectModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  // Form: ChainView
  const [showChainView, setShowChainView]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  // Form: DocumentLoaderFileView
  const [showDocumentLoaderFileForm, setShowDocumentLoaderFileForm]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = React.useState(false);

  // Revalidate ModelGenerate when model is changed with SetModelView Form
  React.useEffect(() => {
    if (!showSelectModelForm) {
      RevalidateModelGenerate();
      RevalidateModelEmbedding();
      RevalidateChainPreferences();
    }
  }, [showSelectModelForm]);

  // Get Answer from Local Storage every time SaveChatView is not visible
  React.useEffect(() => {
    if (!showFormSaveChat) {
      RevalidateChatName();
      GetAnswerListHistory().then((data) => {
        setAnswerListHistory(data);
      });
    }
  }, [showFormSaveChat]);

  if (showSelectModelForm) return <SetModelView Command={"chat"} ShowModelView={setShowSelectModelForm} />;

  if (showFormSaveChat) return <SaveChatView ShowSaveChatView={setShowFormSaveChat} ChatHistory={answerListHistory} />;

  if (showChainView) return <ChainView ShowChainView={setShowChainView} />;

  if (showDocumentLoaderFileForm)
    return <DocumentLoaderFileView ShowDocumentLoaderFileView={setShowDocumentLoaderFileForm} />;

  /**
   * Raycast Action Panel for Ollama
   * @param {[string, string, OllamaApiGenerateResponse]} item? - Selected Answer
   * @returns {JSX.Element}
   */
  function ActionOllama(item?: [string, string, OllamaApiGenerateResponse]): JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Ollama">
          {query && ModelGenerate && <Action title="Get Answer" icon={Icon.SpeechBubbleActive} onAction={Inference} />}
          {item?.[0] && (
            <Action.CopyToClipboard
              title="Copy Question"
              content={item[0] as string}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          {item?.[1] && (
            <Action.CopyToClipboard
              title="Copy Answer"
              content={item[1] as string}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {item && <Action.CopyToClipboard title="Copy Conversation" content={clipboardConversation} />}
          {ChatName === "Current" && item && (
            <Action
              title="Archive Conversation"
              icon={Icon.Box}
              onAction={() => setShowFormSaveChat(true)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {item && (
            <Action
              title="Clear Conversation"
              icon={Icon.Trash}
              onAction={ClearAnswerList}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            title="Change Model"
            icon={Icon.Box}
            onAction={() => setShowSelectModelForm(true)}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Document Loader">
          <Action title="Chain" icon={Icon.Link} onAction={() => setShowChainView(true)} />
          <Action
            title="File Loader"
            icon={Icon.Finder}
            onAction={() => setShowDocumentLoaderFileForm(true)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Ask..."
      searchText={query}
      onSearchTextChange={setQuery}
      selectedItemId={selectedAnswer}
      actions={!loading && ActionOllama()}
      isShowingDetail={
        answerListHistory.get(ChatName)?.length != undefined && (answerListHistory.get(ChatName)?.length as number) > 0
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Chat History" value={ChatName} onChange={ChangeChat}>
          {!loading &&
            Array.from(answerListHistory.keys()).map((key) => <List.Dropdown.Item key={key} title={key} value={key} />)}
        </List.Dropdown>
      }
    >
      {(() => {
        if (
          answerListHistory.get(ChatName)?.length != undefined &&
          (answerListHistory.get(ChatName)?.length as number) > 0
        ) {
          return answerListHistory.get(ChatName)?.map((item, index) => (
            <List.Item
              icon={Icon.Message}
              title={item[0]}
              key={index}
              id={index.toString()}
              actions={!loading && ActionOllama(item)}
              detail={
                <List.Item.Detail
                  markdown={`${item[1]}`}
                  metadata={
                    preferences.ollamaShowMetadata &&
                    item[2].context && (
                      <Detail.Metadata>
                        <Detail.Metadata.Label title="Model" text={item[2].model} />
                        <Detail.Metadata.Separator />
                        {item[2].eval_count && item[2].eval_duration ? (
                          <Detail.Metadata.Label
                            title="Generation Speed"
                            text={`${(item[2].eval_count / (item[2].eval_duration / 1e9)).toFixed(2)} token/s`}
                          />
                        ) : null}
                        {item[2].total_duration ? (
                          <Detail.Metadata.Label
                            title="Total Inference Duration"
                            text={`${(item[2].total_duration / 1e9).toFixed(2)}s`}
                          />
                        ) : null}
                        {item[2].load_duration ? (
                          <Detail.Metadata.Label
                            title="Load Duration"
                            text={`${(item[2].load_duration / 1e9).toFixed(2)}s`}
                          />
                        ) : null}
                        {item[2].prompt_eval_count ? (
                          <Detail.Metadata.Label title="Prompt Eval Count" text={`${item[2].prompt_eval_count}`} />
                        ) : null}
                        {item[2].prompt_eval_duration ? (
                          <Detail.Metadata.Label
                            title="Prompt Eval Duration"
                            text={`${(item[2].prompt_eval_duration / 1e9).toFixed(2)}s`}
                          />
                        ) : null}
                        {item[2].eval_count ? (
                          <Detail.Metadata.Label title="Eval Count" text={`${item[2].eval_count}`} />
                        ) : null}
                        {item[2].eval_duration ? (
                          <Detail.Metadata.Label
                            title="Eval Duration"
                            text={`${(item[2].eval_duration / 1e9).toFixed(2)}s`}
                          />
                        ) : null}
                      </Detail.Metadata>
                    )
                  }
                />
              }
            />
          ));
        }
        return <List.EmptyView icon={Icon.Message} title="Start a Conversation with Ollama" />;
      })()}
    </List>
  );
}
