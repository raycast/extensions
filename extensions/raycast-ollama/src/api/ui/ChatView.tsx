import {
  Chains,
  ModelType,
  OllamaApiChatMessage,
  OllamaApiShowModelfile,
  PromptTags,
  RaycastChatMessage,
  RaycastImage,
} from "../types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorOllamaModelNotMultimodal,
  ErrorRaycastModelNotConfiguredOnLocalStorage,
} from "../errors";
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
    if (
      err instanceof ErrorOllamaModelNotInstalled ||
      err instanceof ErrorOllamaModelNotMultimodal ||
      err == ErrorRaycastModelNotConfiguredOnLocalStorage
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: err.message,
        message:
          err instanceof ErrorOllamaModelNotInstalled || err instanceof ErrorOllamaModelNotMultimodal
            ? err.suggest
            : undefined,
      });
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
   * Verify required Ollama version based on used tags.
   *
   * @param {PromptTags | undefined} tag - Tag used on prompt.
   * @returns {Promise<boolean>} Return `false` if installed Ollama Version doesn't meat minimum required version otherwise `true`.
   */
  async function InferenceVerifyOllamaVersion(tag: PromptTags | undefined = undefined): Promise<boolean> {
    const OllamaVersionMin = tag === PromptTags.IMAGE ? "0.1.15" : "0.1.14";
    if (OllamaVersion && !VerifyOllamaVersion(OllamaVersion, OllamaVersionMin)) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Ollama API version is outdated, at least ${OllamaVersionMin} is required.`,
      });
      return false;
    }
    return true;
  }

  /**
   * Verify required Model capabilities.
   *
   * @param {PromptTags | undefined} tag - Tag used on prompt.
   * @returns {Promise<boolean>} Return `false` if required Model is not installed or configured.
   */
  async function InferenceVerifyModel(tag: PromptTags | undefined = undefined): Promise<boolean> {
    switch (tag) {
      case PromptTags.IMAGE:
        if (!ModelImage) {
          await showToast({
            style: Toast.Style.Failure,
            title: "'/image' tag require a Model with Vision capabilities",
          });
          return false;
        }
        break;
      default:
        if (!ModelGenerate) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Model not configured",
          });
          return false;
        }
        break;
    }
    return true;
  }

  /**
   * Get Images from Finder if no file is selected fallback to Clipboard.
   *
   * @returns {Promise<RaycastImage[] | undefined>}
   */
  async function InferenceTagImage(): Promise<RaycastImage[] | undefined> {
    return await GetImage().catch(async (err) => {
      showToast({ style: Toast.Style.Failure, title: err.message });
      return undefined;
    });
  }

  /**
   * Get Document based on chosed tag.
   *
   * @param {string} prompt.
   * @param {PromptTags} tag.
   * @returns {Promise<Document<Record<string, any>>[] | undefined>}
   */
  async function InferenceTagDocument(
    prompt: string,
    tag: PromptTags
  ): Promise<Document<Record<string, any>>[] | undefined> {
    const Model = ModelEmbedding ? ModelEmbedding.name : ModelGenerate?.name;
    if (!Model) return undefined;

    const ChainType = ChainPreferences ? ChainPreferences.type : Chains.STUFF;
    const ModelNumCtx = ModelGenerateModelfile?.parameter.num_ctx ? ModelGenerateModelfile.parameter.num_ctx : 2048;
    const ModelTemplateLength = ModelGenerateModelfile?.template ? ModelGenerateModelfile.template.length : 0;
    const ChainDocumentsChunkSize = ChainType === Chains.REFINE ? ModelNumCtx * 3.5 : undefined;

    let ChainDocumentsNumber = 0;

    switch (ChainType) {
      case Chains.STUFF:
        ChainDocumentsNumber = Math.trunc(((ModelNumCtx * 4 - prompt.length - ModelTemplateLength) / 1000) * 0.5);
        break;
      case Chains.REFINE:
        ChainDocumentsNumber = ChainPreferences?.parameter?.docsNumber ? ChainPreferences.parameter.docsNumber : 5;
        break;
    }

    await showToast({ style: Toast.Style.Animated, title: "📄 Loading Documents." });
    return await GetDocument(prompt, Model, [tag], ChainDocumentsNumber, ChainDocumentsChunkSize).catch(
      async (e: Error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: e.message,
        });
        return undefined;
      }
    );
  }

  /**
   * Get Messages History.
   *
   * @returns {OllamaApiChatMessage[] | undefined}
   */
  function InferenceHistoryMessages(): OllamaApiChatMessage[] | undefined {
    const HistoryLength = Number(preferences.ollamaChatHistoryMessagesNumber)
      ? Number(preferences.ollamaChatHistoryMessagesNumber)
      : 20;
    const History = ChatHistory.slice(ChatHistory.length - HistoryLength).flatMap((h) => h.messages);
    if (History.length > 0) return History;
    return undefined;
  }

  /**
   * Get Inference Stream
   *
   * @param {string} prompt.
   * @param {PromptTags | undefined} tag.
   * @param {OllamaApiChatMessage[] | undefined} history.
   * @returns {Promise<[EventEmitter | undefined, RaycastImage[] | undefined, Document<Record<string, any>>[] | undefined]>}
   */
  async function InferenceStream(
    prompt: string,
    tag: PromptTags | undefined = undefined,
    history: OllamaApiChatMessage[] | undefined = undefined
  ): Promise<[EventEmitter | undefined, RaycastImage[] | undefined, Document<Record<string, any>>[] | undefined]> {
    let stream: EventEmitter | undefined;
    let images: RaycastImage[] | undefined;
    let docs: Document<Record<string, any>>[] | undefined;
    switch (tag) {
      case PromptTags.IMAGE:
        images = await InferenceTagImage();
        if (!images) return [stream, images, docs];
        stream = await LLMChain(
          prompt,
          ModelImage?.name as string,
          history,
          images.map((i) => i.base64)
        );
        await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Images." });
        break;
      case PromptTags.FILE:
        docs = await InferenceTagDocument(prompt, tag);
        if (!docs) return [stream, images, docs];
        switch (ChainPreferences?.type) {
          case Chains.REFINE:
            stream = await loadQARefineChain(prompt, ModelGenerate?.name as string, docs, history);
            break;
          default:
            stream = await loadQAStuffChain(prompt, ModelGenerate?.name as string, docs, history);
            break;
        }
        await showToast({ style: Toast.Style.Animated, title: "🧠 Inference with Documents." });
        break;
      default:
        stream = await LLMChain(prompt, ModelGenerate?.name as string, history);
        await showToast({ style: Toast.Style.Animated, title: "🧠 Inference." });
        break;
    }
    return [stream, images, docs];
  }

  /**
   * Start Inference Stream Listener
   *
   * @param {EventEmitter} stream.
   * @param {string} prompt.
   * @param {PromptTags | undefined} tags.
   * @param {RaycastImage[] | undefined} images.
   * @param {Document<Record<string, any>>[] | undefined} docs.
   */
  async function InferenceStreamListener(
    stream: EventEmitter,
    prompt: string,
    tag: PromptTags | undefined = undefined,
    images: RaycastImage[] | undefined = undefined,
    docs: Document<Record<string, any>>[] | undefined
  ): Promise<void> {
    setQuery("");

    SetChatHistory((prevState) => {
      prevState.push({
        model: ModelGenerate ? ModelGenerate.name : "",
        created_at: "",
        tags: tag ? [tag] : undefined,
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
  }

  /**
   * Start Inference with Ollama API.
   * @returns {Promise<void>}
   */
  async function Inference(): Promise<void> {
    setLoading(true);

    // Find Tags.
    const [prompt, tags] = GetTags(query);
    if (tags.length > 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Multiple tags is not allowed",
      });
      setLoading(false);
      return;
    }
    const inferenceTag = tags[0];

    // Check required Ollama Version.
    if (!(await InferenceVerifyOllamaVersion(inferenceTag))) {
      setLoading(false);
      return;
    }

    // Check Model is Configured
    if (!(await InferenceVerifyModel(inferenceTag))) {
      setLoading(false);
      setShowSelectModelForm(true);
      return;
    }

    // Loading Message History.
    const history = InferenceHistoryMessages();

    // Init Inferance Stream
    const [stream, images, docs] = await InferenceStream(prompt, inferenceTag, history);
    if (!stream) {
      setLoading(false);
      return;
    }

    // Listen on Inference Stream
    await InferenceStreamListener(stream, prompt, inferenceTag, images, docs);
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
      onSearchTextChange={(t) => {
        if (!loading) setQuery(t);
      }}
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
