import {
  Chains,
  ModelType,
  OllamaApiChatMessage,
  OllamaApiShowModelfile,
  PromptTags,
  RaycastChatMessage,
  RaycastImage,
} from "../types";
import { ErrorOllamaCustomModel, ErrorOllamaModelNotInstalled } from "../errors";
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
import {
  GetChainPreferences,
  GetChatHistory,
  GetModel,
  GetChatName,
  GetModelModelfile,
  SaveChatToHistory,
  GetChatHistoryKeys,
  DeleteChatHistory,
  GetImage,
  VerifyOllamaVersion,
} from "../common";
import { OllamaApiVersion } from "../ollama";

const preferences = getPreferenceValues();

/**
 * Return JSX element for chat view.
 * @returns {JSX.Element} Raycast Chat View.
 */
export function ChatView(): JSX.Element {
  const { data: OllamaVersion, isLoading: IsLoadingOllamaVersion } = usePromise(OllamaApiVersion, [], {
    onError: HandleError,
  });
  const {
    data: ModelGenerate,
    revalidate: RevalidateModelGenerate,
    isLoading: IsLoadingModelGenerate,
  } = usePromise(GetModel, ["chat", false, undefined, ModelType.GENERATE], {
    onData: async (data) => {
      const modelfile = await GetModelModelfile(data.name);
      SetModelGenerateModelfile(modelfile);
    },
    onError: HandleError,
  });
  const [ModelGenerateModelfile, SetModelGenerateModelfile]: [
    OllamaApiShowModelfile | undefined,
    React.Dispatch<React.SetStateAction<OllamaApiShowModelfile | undefined>>
  ] = React.useState();
  const {
    data: ModelEmbedding,
    revalidate: RevalidateModelEmbedding,
    isLoading: IsLoadingModelEmbedding,
  } = usePromise(GetModel, ["chat", false, undefined, ModelType.EMBEDDING], {
    onError: () => {
      return;
    },
  });
  const {
    data: ModelImage,
    revalidate: RevalidateModelImage,
    isLoading: IsLoadingModelImage,
  } = usePromise(GetModel, ["chat", false, undefined, ModelType.IMAGE], {
    onError: () => {
      return;
    },
  });
  const {
    data: ChainPreferences,
    revalidate: RevalidateChainPreferences,
    isLoading: IsLoadingChainPreferences,
  } = usePromise(GetChainPreferences);
  const {
    data: ChatName,
    revalidate: RevalidateChatName,
    isLoading: IsLoadingChatName,
  } = usePromise(GetChatName, [], {
    onData: async (data) => {
      if (data) SetChatHistory(await GetChatHistory(data));
    },
  });
  const {
    data: ChatHistoryKeys,
    revalidate: RevalidateChatHistoryKeys,
    isLoading: IsLoadingChatHistoryKeys,
  } = usePromise(GetChatHistoryKeys);
  const [ChatHistory, SetChatHistory]: [
    RaycastChatMessage[],
    React.Dispatch<React.SetStateAction<RaycastChatMessage[]>>
  ] = React.useState([] as RaycastChatMessage[]);
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [query, setQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [selectedAnswer, setSelectedAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("0");
  const [showAnswerMetadata, setShowAnswerMetadata] = React.useState(false);

  /**
   * Handle Error from Ollama API.
   * @param {Error} err - Error object.
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
   * Start Inference with Ollama API.
   * @returns {Promise<void>}
   */
  async function Inference(): Promise<void> {
    try {
      const [prompt, tags] = GetTags(query);

      setLoading(true);
      setQuery("");

      let docs: Document<Record<string, any>>[] | undefined = undefined;
      let images: RaycastImage[] | undefined = undefined;

      if (OllamaVersion && tags.length > 0 && tags.find((t) => t === PromptTags.IMAGE)) {
        if (!VerifyOllamaVersion(OllamaVersion, "0.1.15")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Ollama API version is outdated, at least v0.1.15 is required for this feature.",
          });
          setLoading(false);
          return;
        }
        if (!ModelImage) {
          await showToast({ style: Toast.Style.Failure, title: "No Image Model is selected." });
          setLoading(false);
          setShowSelectModelForm(true);
          return;
        }
        images = await GetImage().catch(async (err) => {
          showToast({ style: Toast.Style.Failure, title: err.message });
          return undefined;
        });
        if (!images) {
          setLoading(false);
          return;
        }
      }

      if (tags.length > 0 && tags.find((t) => t !== PromptTags.IMAGE)) {
        await showToast({ style: Toast.Style.Animated, title: "📄 Loading Documents." });

        let DocsNumber: number | undefined;
        if (ModelGenerateModelfile)
          if (ChainPreferences === undefined || ChainPreferences.type === Chains.STUFF) {
            DocsNumber = Math.trunc(
              ((ModelGenerateModelfile.parameter.num_ctx * 4 - prompt.length - ModelGenerateModelfile.template.length) /
                1000) *
                0.5
            );
            if (ModelGenerate)
              docs = await GetDocument(
                prompt,
                ModelEmbedding ? ModelEmbedding.name : ModelGenerate.name,
                tags,
                DocsNumber
              );
          } else if (ChainPreferences.type === Chains.REFINE && ChainPreferences.parameter?.docsNumber) {
            DocsNumber = ChainPreferences.parameter.docsNumber;
            if (ModelGenerate)
              docs = await GetDocument(
                prompt,
                ModelEmbedding ? ModelEmbedding.name : ModelGenerate.name,
                tags,
                DocsNumber,
                ModelGenerateModelfile.parameter.num_ctx * 3.5
              );
          }
      }

      let history: OllamaApiChatMessage[] | undefined = [];
      const historyN = Number(preferences.ollamaChatHistoryMessagesNumber)
        ? Number(preferences.ollamaChatHistoryMessagesNumber)
        : 20;
      ChatHistory.slice(ChatHistory.length - historyN).forEach((h) => history && history.push(...h.messages));
      if (history.length === 0) history = undefined;

      let stream: EventEmitter | undefined;
      if (docs && docs.length > 0) {
        if (ChainPreferences === undefined || ChainPreferences.type === Chains.STUFF) {
          if (ModelImage && images) {
            await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents and Images." });
            stream = await loadQAStuffChain(
              prompt,
              ModelImage.name,
              docs,
              history,
              images.map((i) => i.base64)
            );
          } else if (ModelGenerate) {
            await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents." });
            stream = await loadQAStuffChain(prompt, ModelGenerate.name, docs, history);
          }
        } else if (ChainPreferences.type === Chains.REFINE) {
          if (ModelImage && images) {
            await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents and Images." });
            stream = await loadQARefineChain(
              prompt,
              ModelImage.name,
              docs,
              history,
              images.map((i) => i.base64)
            );
          } else if (ModelGenerate) {
            await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents." });
            stream = await loadQARefineChain(prompt, ModelGenerate.name, docs, history);
          }
        }
      } else {
        if (ModelImage && images) {
          await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Images." });
          stream = await LLMChain(
            prompt,
            ModelImage.name,
            history,
            images.map((i) => i.base64)
          );
        } else if (ModelGenerate) {
          await showToast({ style: Toast.Style.Animated, title: "🧠 Inference." });
          stream = await LLMChain(prompt, ModelGenerate.name, history);
        }
      }

      if (stream) {
        SetChatHistory((prevState) => {
          prevState.push({
            model: ModelGenerate ? ModelGenerate.name : "",
            created_at: "",
            tags: tags.length > 0 ? tags : undefined,
            sources: docs ? [...new Set(docs.map((d) => d.metadata.source))] : undefined,
            images: images,
            messages: [
              { role: "user", content: prompt },
              { role: "assistant", content: "" },
            ],
            done: false,
          } as RaycastChatMessage);
          setSelectedAnswer((prevState.length - 1).toString());
          return [...prevState];
        });

        stream.on("data", (data) => {
          SetChatHistory((prevState) => {
            prevState[prevState.length - 1].messages[1].content += data;
            return [...prevState];
          });
        });

        stream.on("done", async (data) => {
          await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
          SetChatHistory((prevState) => {
            const i = prevState.length - 1;
            prevState[i].model = data.model;
            prevState[i].created_at = data.created_at;
            prevState[i].total_duration = data.total_duration;
            prevState[i].load_duration = data.load_duration;
            prevState[i].prompt_eval_count = data.prompt_eval_count;
            prevState[i].prompt_eval_duration = data.prompt_eval_duration;
            prevState[i].eval_count = data.eval_count;
            prevState[i].eval_duration = data.eval_duration;
            prevState[i].done = true;
            return [...prevState];
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
   * Change Chat Name and save to LocalStorage
   * @param {string} name - Chat Name
   * @return {Promise<void>}
   */
  async function ChangeChat(name: string): Promise<void> {
    await LocalStorage.setItem("chat_name", name);
    RevalidateChatName();
  }

  /**
   * Set Clipboard
   * @returns {string}
   */
  function ClipboardConversation(): string {
    let clipboard = "";
    if (ChatHistory) {
      ChatHistory.map(
        (value) => (clipboard += `Question:\n${value.messages[0].content}\n\nAnswer:${value.messages[1].content}\n\n`)
      );
    }
    return clipboard;
  }

  React.useEffect(() => {
    if (ChatHistory && ChatHistory.length > 0 && ChatHistory[ChatHistory.length - 1].done) {
      SaveChatToHistory(ChatName as string, ChatHistory);
    }
  }, [ChatHistory]);

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
      RevalidateModelImage();
      RevalidateChainPreferences();
    }
  }, [showSelectModelForm]);

  // Get Answer from Local Storage every time SaveChatView is not visible
  React.useEffect(() => {
    if (!showFormSaveChat) {
      RevalidateChatHistoryKeys();
      RevalidateChatName();
    }
  }, [showFormSaveChat]);

  if (showSelectModelForm) return <SetModelView Command={"chat"} ShowModelView={setShowSelectModelForm} />;

  if (showFormSaveChat && ChatHistoryKeys)
    return (
      <SaveChatView
        ShowSaveChatView={setShowFormSaveChat}
        ChatHistoryKeys={ChatHistoryKeys}
        ChatMessages={ChatHistory}
      />
    );

  if (showChainView) return <ChainView ShowChainView={setShowChainView} />;

  if (showDocumentLoaderFileForm)
    return <DocumentLoaderFileView ShowDocumentLoaderFileView={setShowDocumentLoaderFileForm} />;

  /**
   * Action Panel for  Message
   * @param {RaycastChatMessage} props.message - Selected Message
   * @returns {JSX.Element}
   */
  function ActionMessage(props: { message?: RaycastChatMessage }): JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Ollama">
          {OllamaVersion && query && ModelGenerate && (
            <Action title="Get Answer" icon={Icon.SpeechBubbleActive} onAction={Inference} />
          )}
          {props.message && (
            <Action.CopyToClipboard
              title="Copy Question"
              content={props.message.messages[0].content as string}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          {props.message && (
            <Action.CopyToClipboard
              title="Copy Answer"
              content={props.message.messages[1].content as string}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {props.message && <Action.CopyToClipboard title="Copy Conversation" content={ClipboardConversation()} />}
          {ChatName === "Current" && ChatHistoryKeys && props.message && (
            <Action
              title="Archive Conversation"
              icon={Icon.Box}
              onAction={() => setShowFormSaveChat(true)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {props.message && (
            <Action
              title="Clear Conversation"
              icon={Icon.Trash}
              onAction={() => {
                DeleteChatHistory(ChatName as string).then(() => {
                  RevalidateChatName();
                  RevalidateChatHistoryKeys();
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            title={showAnswerMetadata ? "Hide Metadata" : "Show Metadata"}
            icon={showAnswerMetadata ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            onAction={() => setShowAnswerMetadata((prevState) => !prevState)}
          />
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

  /**
   * Raycast Detail Metadata for Ollama Message
   * @param {RaycastChatMessage} props.message
   * @returns {JSX.Element}
   */
  function DetailMetadataMessage(props: { message: RaycastChatMessage }): JSX.Element {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Model" text={props.message.model} />
        <Detail.Metadata.Separator />
        {props.message.tags && props.message.tags.length > 0 && (
          <Detail.Metadata.TagList title="Tags">
            {props.message.tags.map((tag) => (
              <Detail.Metadata.TagList.Item text={tag} />
            ))}
          </Detail.Metadata.TagList>
        )}
        {props.message.sources && props.message.sources.length > 0 && (
          <Detail.Metadata.TagList title="Sources">
            {props.message.sources.map((source) => (
              <Detail.Metadata.TagList.Item text={source} />
            ))}
          </Detail.Metadata.TagList>
        )}
        {props.message.tags || (props.message.sources && <Detail.Metadata.Separator />)}
        {props.message.eval_count && props.message.eval_duration && (
          <Detail.Metadata.Label
            title="Generation Speed"
            text={`${(props.message.eval_count / (props.message.eval_duration / 1e9)).toFixed(2)} token/s`}
          />
        )}
        {props.message.total_duration && (
          <Detail.Metadata.Label
            title="Total Inference Duration"
            text={`${(props.message.total_duration / 1e9).toFixed(2)}s`}
          />
        )}
        {props.message.load_duration && (
          <Detail.Metadata.Label title="Load Duration" text={`${(props.message.load_duration / 1e9).toFixed(2)}s`} />
        )}
        {props.message.prompt_eval_count && (
          <Detail.Metadata.Label title="Prompt Eval Count" text={`${props.message.prompt_eval_count}`} />
        )}
        {props.message.prompt_eval_duration && (
          <Detail.Metadata.Label
            title="Prompt Eval Duration"
            text={`${(props.message.prompt_eval_duration / 1e9).toFixed(2)}s`}
          />
        )}
        {props.message.eval_count && <Detail.Metadata.Label title="Eval Count" text={`${props.message.eval_count}`} />}
        {props.message.eval_duration && (
          <Detail.Metadata.Label title="Eval Duration" text={`${(props.message.eval_duration / 1e9).toFixed(2)}s`} />
        )}
      </Detail.Metadata>
    );
  }

  return (
    <List
      isLoading={
        loading ||
        IsLoadingOllamaVersion ||
        IsLoadingModelGenerate ||
        IsLoadingModelEmbedding ||
        IsLoadingModelImage ||
        IsLoadingChainPreferences ||
        IsLoadingChatName ||
        IsLoadingChatHistoryKeys
      }
      searchBarPlaceholder="Ask..."
      searchText={query}
      onSearchTextChange={setQuery}
      selectedItemId={selectedAnswer}
      actions={
        !(
          loading ||
          IsLoadingOllamaVersion ||
          IsLoadingModelGenerate ||
          IsLoadingModelEmbedding ||
          IsLoadingModelImage ||
          IsLoadingChainPreferences ||
          IsLoadingChatName ||
          IsLoadingChatHistoryKeys
        ) && <ActionMessage />
      }
      isShowingDetail={ChatHistory.length > 0}
      searchBarAccessory={
        !IsLoadingChatHistoryKeys && ChatHistoryKeys ? (
          <List.Dropdown tooltip="Chat History" defaultValue={ChatName} onChange={ChangeChat}>
            {ChatHistoryKeys.map((key) => (
              <List.Dropdown.Item key={key} title={key} value={key} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {ChatHistory.length > 0 ? (
        ChatHistory.map((item, index) => (
          <List.Item
            icon={Icon.Message}
            title={item.messages[0].content}
            key={index}
            id={index.toString()}
            actions={!loading && <ActionMessage message={item} />}
            detail={
              <List.Item.Detail
                markdown={`${item.images ? `${item.images.map((i) => i.html)}\n` : ""}${item.messages[1].content}`}
                metadata={showAnswerMetadata && item.done && <DetailMetadataMessage message={item} />}
              />
            }
          />
        ))
      ) : (
        <List.EmptyView icon={Icon.Message} title="Start a Conversation with Ollama" />
      )}
    </List>
  );
}
