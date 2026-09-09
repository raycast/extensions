import {
  Action,
  ActionPanel,
  Form,
  Toast,
  LocalStorage,
  PopToRootType,
  closeMainWindow,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { buildPrompt, capture, chatTitleFromClip } from "./capture";
import { OpenWebUIClient } from "./openwebui";
import {
  DEFAULT_MODEL_KEY,
  LAST_FOLDER_KEY,
  SEND_FORM_STATE_KEY,
  shouldOpenAfterMainSend,
} from "./settings";
import type {
  CaptureMode,
  ChatRecord,
  Folder,
  ModelInfo,
  PromptMode,
  SendMode,
} from "./types";

interface FormValues {
  captureMode: CaptureMode;
  sendMode: SendMode;
  folderId: string;
  model?: string;
  chatId?: string;
  promptMode?: PromptMode;
  customInstruction?: string;
  generate?: boolean;
}

interface PersistedFormState {
  captureMode: CaptureMode;
  sendMode: SendMode;
  promptMode: PromptMode;
  generate: boolean;
}

const DEFAULT_FORM_STATE: PersistedFormState = {
  captureMode: "selection",
  sendMode: "chat",
  promptMode: "discuss",
  generate: true,
};

function isCaptureMode(value: unknown): value is CaptureMode {
  return value === "selection" || value === "page" || value === "url";
}

function isSendMode(value: unknown): value is SendMode {
  return value === "save" || value === "chat" || value === "append";
}

function isPromptMode(value: unknown): value is PromptMode {
  return (
    value === "none" ||
    value === "discuss" ||
    value === "summarize" ||
    value === "research"
  );
}

function parsePersistedFormState(raw?: string): PersistedFormState {
  if (!raw) return DEFAULT_FORM_STATE;
  try {
    const value = JSON.parse(raw) as Partial<PersistedFormState>;
    return {
      captureMode: isCaptureMode(value.captureMode)
        ? value.captureMode
        : DEFAULT_FORM_STATE.captureMode,
      sendMode: isSendMode(value.sendMode)
        ? value.sendMode
        : DEFAULT_FORM_STATE.sendMode,
      promptMode: isPromptMode(value.promptMode)
        ? value.promptMode
        : DEFAULT_FORM_STATE.promptMode,
      generate:
        typeof value.generate === "boolean"
          ? value.generate
          : DEFAULT_FORM_STATE.generate,
    };
  } catch {
    return DEFAULT_FORM_STATE;
  }
}

function folderLabel(folder: Folder, folders: Folder[]): string {
  const names = [folder.name];
  let parent = folder.parent_id;
  const seen = new Set<string>();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const p = folders.find((item) => item.id === parent);
    if (!p) break;
    names.unshift(p.name);
    parent = p.parent_id ?? null;
  }
  return names.join(" / ");
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const client = useMemo(
    () => new OpenWebUIClient(prefs),
    [prefs.baseUrl, prefs.apiKey],
  );
  const [folders, setFolders] = useState<Folder[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(
    DEFAULT_FORM_STATE.captureMode,
  );
  const [folderId, setFolderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [chatId, setChatId] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>(
    DEFAULT_FORM_STATE.sendMode,
  );
  const [promptMode, setPromptMode] = useState<PromptMode>(
    DEFAULT_FORM_STATE.promptMode,
  );
  const [generate, setGenerate] = useState(DEFAULT_FORM_STATE.generate);
  const [customInstruction, setCustomInstruction] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [
          folderList,
          modelList,
          lastFolderId,
          defaultModelId,
          savedFormRaw,
        ] = await Promise.all([
          client.getFolders(),
          client.getModels(),
          LocalStorage.getItem<string>(LAST_FOLDER_KEY),
          LocalStorage.getItem<string>(DEFAULT_MODEL_KEY),
          LocalStorage.getItem<string>(SEND_FORM_STATE_KEY),
        ]);
        if (cancelled) return;

        const savedForm = parsePersistedFormState(savedFormRaw);
        setFolders(folderList);
        setModels(modelList);
        setCaptureMode(savedForm.captureMode);
        setSendMode(savedForm.sendMode);
        setPromptMode(savedForm.promptMode);
        setGenerate(savedForm.generate);

        const rememberedFolder =
          lastFolderId &&
          folderList.some((folder) => folder.id === lastFolderId)
            ? lastFolderId
            : (folderList[0]?.id ?? "");
        setFolderId(rememberedFolder);

        const preferredModel =
          defaultModelId &&
          modelList.some((model) => model.id === defaultModelId)
            ? defaultModelId
            : (modelList[0]?.id ?? "");
        setModelId(preferredModel);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Connect to Open WebUI",
          message: String(error),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sendMode !== "append" || !folderId) {
      setChats([]);
      setChatId("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await client.getChats(folderId);
        if (!cancelled) {
          setChats(list);
          setChatId((current) =>
            current && list.some((chat) => chat.id === current)
              ? current
              : (list[0]?.id ?? ""),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setChats([]);
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Load Chats",
            message: String(error),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folderId, sendMode]);

  async function persistSubmittedState(values: FormValues): Promise<void> {
    const state: PersistedFormState = {
      captureMode: values.captureMode,
      sendMode: values.sendMode,
      promptMode: values.promptMode ?? promptMode,
      generate: values.generate ?? generate,
    };

    const writes: Promise<void>[] = [
      LocalStorage.setItem(LAST_FOLDER_KEY, values.folderId),
      LocalStorage.setItem(SEND_FORM_STATE_KEY, JSON.stringify(state)),
    ];

    // modelId is kept even when the Model control is temporarily hidden in
    // Save/Append modes. This makes the last explicitly selected model the
    // actual default for the next chat and for both Quick Save commands.
    if (modelId) {
      writes.push(LocalStorage.setItem(DEFAULT_MODEL_KEY, modelId));
    }

    await Promise.all(writes);
  }

  async function finishSuccessfulSubmit(
    destinationUrl?: string,
  ): Promise<void> {
    // Force the view command to unload and return Raycast to root. Otherwise
    // reopening Raycast can reveal the already-submitted form still on screen.
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    if (destinationUrl) await open(destinationUrl);
  }

  async function handleSubmit(values: FormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Capturing Content…",
    });
    try {
      if (!values.folderId)
        throw new Error(
          "No Open WebUI folder is available. Create at least one folder first.",
        );

      // Persist before doing network work. In particular, do not rely on a
      // fire-and-forget model onChange write: the command may unload immediately
      // after a successful submit.
      await persistSubmittedState(values);

      const clip = await capture(values.captureMode);
      toast.title = "Sending to Open WebUI…";

      if (values.sendMode === "save") {
        const saved = await client.saveClipToFolder(values.folderId, clip);
        toast.style = Toast.Style.Success;
        toast.title = "Source Saved";
        toast.message = `${saved.filename} → ${saved.folderName}`;
        await finishSuccessfulSubmit(
          shouldOpenAfterMainSend(prefs.openAfterSendMode)
            ? client.folderUrl(values.folderId)
            : undefined,
        );
        return;
      }

      const prompt = buildPrompt(
        clip,
        values.promptMode ?? promptMode,
        values.customInstruction ?? customInstruction,
      );
      if (values.sendMode === "chat") {
        const selectedModel = values.model || modelId;
        if (!selectedModel) throw new Error("Choose a model for the new chat.");

        // Explicitly persist the exact submitted model and await the write.
        await LocalStorage.setItem(DEFAULT_MODEL_KEY, selectedModel);

        const result = await client.startChat(
          values.folderId,
          selectedModel,
          prompt,
          chatTitleFromClip(clip),
          clip,
          values.generate ?? generate,
        );
        toast.style = Toast.Style.Success;
        toast.title = result.warnings.length
          ? "Chat Created With Warning"
          : "Chat Created, File Attached";
        toast.message =
          result.warnings[0] || result.chat.title || chatTitleFromClip(clip);
        await finishSuccessfulSubmit(
          shouldOpenAfterMainSend(prefs.openAfterSendMode)
            ? client.chatUrl(result.chat.id)
            : undefined,
        );
        return;
      }

      const selectedChatId = values.chatId || chatId;
      if (!selectedChatId) throw new Error("Choose an existing chat.");
      const result = await client.appendToChat(
        selectedChatId,
        prompt,
        clip,
        values.generate ?? generate,
      );
      toast.style = Toast.Style.Success;
      toast.title = result.warnings.length
        ? "Content Added With Warning"
        : "Content and File Added to Chat";
      toast.message = result.warnings[0] || result.chat.title;
      await finishSuccessfulSubmit(
        shouldOpenAfterMainSend(prefs.openAfterSendMode)
          ? client.chatUrl(result.chat.id)
          : undefined,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Send Content";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  const sortedFolders = [...folders].sort((a, b) =>
    folderLabel(a, folders).localeCompare(folderLabel(b, folders), "en"),
  );
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to Open WebUI"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="captureMode"
        title="Capture"
        value={captureMode}
        onChange={(value: string) => setCaptureMode(value as CaptureMode)}
      >
        <Form.Dropdown.Item value="selection" title="Selected Text" />
        <Form.Dropdown.Item value="page" title="Full Page" />
        <Form.Dropdown.Item value="url" title="URL and Title Only" />
      </Form.Dropdown>

      <Form.Dropdown
        id="sendMode"
        title="Action"
        value={sendMode}
        onChange={(value: string) => setSendMode(value as SendMode)}
      >
        <Form.Dropdown.Item value="chat" title="Create Chat in Folder" />
        <Form.Dropdown.Item
          value="save"
          title="Save as Folder Source Without Chat"
        />
        <Form.Dropdown.Item value="append" title="Append to Existing Chat" />
      </Form.Dropdown>

      <Form.Dropdown
        id="folderId"
        title="Folder"
        value={folderId}
        onChange={setFolderId}
      >
        {sortedFolders.map((folder) => (
          <Form.Dropdown.Item
            key={folder.id}
            value={folder.id}
            title={folderLabel(folder, folders)}
          />
        ))}
      </Form.Dropdown>

      {sendMode === "chat" ? (
        <Form.Dropdown
          id="model"
          title="Model"
          value={modelId}
          onChange={setModelId}
        >
          {models.map((model) => (
            <Form.Dropdown.Item
              key={model.id}
              value={model.id}
              title={model.name || model.id}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Model"
          text={
            sendMode === "append"
              ? "The selected chat's model will be used."
              : "Saving a folder source does not run a model."
          }
        />
      )}

      {sendMode === "append" && (
        <Form.Dropdown
          id="chatId"
          title="Chat"
          value={chatId}
          onChange={setChatId}
        >
          {chats.map((chat) => (
            <Form.Dropdown.Item
              key={chat.id}
              value={chat.id}
              title={chat.title || chat.id}
            />
          ))}
        </Form.Dropdown>
      )}

      {sendMode !== "save" && (
        <>
          <Form.Dropdown
            id="promptMode"
            title="Prompt"
            value={promptMode}
            onChange={(value: string) => setPromptMode(value as PromptMode)}
          >
            <Form.Dropdown.Item value="none" title="Context Only" />
            <Form.Dropdown.Item value="discuss" title="Discuss" />
            <Form.Dropdown.Item value="summarize" title="Summarize" />
            <Form.Dropdown.Item value="research" title="Critical Analysis" />
          </Form.Dropdown>
          <Form.TextArea
            id="customInstruction"
            title="Custom Prompt"
            placeholder="Optional. When provided, this replaces the preset prompt above."
            value={customInstruction}
            onChange={setCustomInstruction}
          />
          <Form.Checkbox
            id="generate"
            label="Start Model Response Immediately"
            value={generate}
            onChange={setGenerate}
          />
        </>
      )}

      <Form.Description
        title="Storage Format"
        text="When creating or appending to a chat, the Markdown file is attached to the message and also added as a source for the selected folder."
      />
    </Form>
  );
}
