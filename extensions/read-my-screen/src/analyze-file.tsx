import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeImage, formatVisionError } from "./analyze-image";
import { ReplyForm, SavePresetForm, SessionModelForm } from "./chat-forms";
import { mimeTypeForImagePath } from "./clipboard-image";
import {
  BUILTIN_PROMPT_PRESETS,
  PRESET_PREF_DEFAULT,
  addCustomPreset,
  loadCustomPresets,
  promptForPresetValue,
  type CustomPromptPreset,
} from "./prompt-presets";
import { type ChatTurn, continueConversation, type SessionContext } from "./continue-chat";
import { effectiveModelPreference, MODEL_PREFERENCE_OPTIONS, parseModelPreference } from "./model";
import { regenerateLastTurn } from "./regenerate-turn";
import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import { exportChatConversationToFile } from "./export-chat";
import { appendStoredSession, chatToMarkdown } from "./stored-sessions";
import { formatUsageHint, pushUsageLedger, sumTokenUsages, type TokenUsage } from "./token-usage";
import { ChatThreadList } from "./ui/chat-thread-list";
import { previewText } from "./ui/markdown";

type FormValues = {
  imageFile: string[];
  prompt: string;
};

export default function AnalyzeFileCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const { push, pop } = useNavigation();
  const defaultPrompt =
    prefs.defaultPrompt?.trim() ||
    "Describe what you see on the screen. Call out any text, UI elements, errors, or notable details.";

  const [phase, setPhase] = useState<"setup" | "chat">("setup");
  const [formKey, setFormKey] = useState(0);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [session, setSession] = useState<SessionContext | null>(null);
  const [promptText, setPromptText] = useState(defaultPrompt);
  const [presetSelection, setPresetSelection] = useState(PRESET_PREF_DEFAULT);
  const [customPresets, setCustomPresets] = useState<CustomPromptPreset[]>([]);
  const [pickedFiles, setPickedFiles] = useState<string[]>([]);
  const [setupModelOverride, setSetupModelOverride] = useState("");
  const [sessionModel, setSessionModel] = useState("");
  const [lastRequestUsage, setLastRequestUsage] = useState<TokenUsage | null>(null);
  const [usageLedger, setUsageLedger] = useState<TokenUsage[]>([]);
  const showTokenUsagePref = prefs.showTokenUsage === true;
  const showEstimatedCostPref = showTokenUsagePref && prefs.showEstimatedCost === true;

  const effectiveSessionModel = sessionModel.trim() || prefs.model?.trim() || "openai:gpt-4o-mini";
  const usageHintOpts = useMemo(
    () => ({ modelValue: effectiveSessionModel, showEstimatedCost: showEstimatedCostPref }),
    [effectiveSessionModel, showEstimatedCostPref],
  );
  const sessionUsageTotal = useMemo(() => sumTokenUsages(usageLedger), [usageLedger]);

  useEffect(() => {
    void loadCustomPresets().then(setCustomPresets);
  }, []);

  useEffect(() => {
    if (presetSelection === PRESET_PREF_DEFAULT) {
      setPromptText(defaultPrompt);
    }
  }, [defaultPrompt, presetSelection]);

  const startOver = useCallback(() => {
    setMessages([]);
    setSession(null);
    setPhase("setup");
    setPromptText(defaultPrompt);
    setPresetSelection(PRESET_PREF_DEFAULT);
    setLastRequestUsage(null);
    setUsageLedger([]);
    setSessionModel("");
    setSetupModelOverride("");
    setPickedFiles([]);
    setFormKey((k) => k + 1);
  }, [defaultPrompt]);

  const sendFollowUp = useCallback(
    async (followUpRaw: string) => {
      const followUp = followUpRaw.trim();
      if (!followUp || !session) {
        return;
      }

      const parsed = parseModelPreference(effectiveSessionModel);
      const thread: ChatTurn[] = [...messages, { role: "user", content: followUp }];

      const loading = await showToast({
        style: Toast.Style.Animated,
        title: "Waiting for reply…",
      });

      try {
        const { text: reply, usage } = await continueConversation(prefs, parsed, session, thread);
        setMessages([...thread, { role: "assistant", content: reply }]);
        setLastRequestUsage(usage ?? null);
        setUsageLedger((prev) => pushUsageLedger(prev, usage, false));
        await Clipboard.copy(reply);
        loading.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "Reply ready",
          message: `Copied to clipboard.${formatUsageHint(usage, showTokenUsagePref, usageHintOpts)}`,
        });
      } catch (err) {
        loading.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Message failed",
          message: formatVisionError(err),
        });
      }
    },
    [messages, prefs, session, showTokenUsagePref, usageHintOpts, effectiveSessionModel],
  );

  const runRegenerate = useCallback(async () => {
    if (!session || messages.length < 2) {
      return;
    }
    const loading = await showToast({
      style: Toast.Style.Animated,
      title: "Regenerating…",
    });
    try {
      const { messages: next, usage } = await regenerateLastTurn(prefs, effectiveSessionModel, messages, session);
      setMessages(next);
      setLastRequestUsage(usage);
      setUsageLedger((prev) => pushUsageLedger(prev, usage, true));
      const last = [...next].reverse().find((m) => m.role === "assistant");
      if (last) {
        await Clipboard.copy(last.content);
      }
      loading.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Regenerated",
        message: `Copied to clipboard.${formatUsageHint(usage ?? undefined, showTokenUsagePref, usageHintOpts)}`,
      });
    } catch (err) {
      loading.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Regenerate failed",
        message: formatVisionError(err),
      });
    }
  }, [messages, prefs, session, showTokenUsagePref, usageHintOpts, effectiveSessionModel]);

  const openSessionModelPicker = useCallback(() => {
    push(
      <SessionModelForm
        initialModel={effectiveSessionModel}
        onSubmit={(model) => {
          pop();
          setSessionModel(model.trim());
          void showToast({ style: Toast.Style.Success, title: "Model updated for this chat" });
        }}
      />,
    );
  }, [effectiveSessionModel, pop, push]);

  const openReply = useCallback(() => {
    push(
      <ReplyForm
        onSubmit={(text) => {
          pop();
          void sendFollowUp(text);
        }}
      />,
    );
  }, [pop, push, sendFollowUp]);

  const copyConversationMarkdown = useCallback(async () => {
    await Clipboard.copy(chatToMarkdown(messages));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: "Full conversation as Markdown.",
    });
  }, [messages]);

  const exportConversationToFile = useCallback(async () => {
    try {
      exportChatConversationToFile(messages, effectiveSessionModel, sessionUsageTotal);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported",
        message: "Markdown saved; Finder opened to the file.",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [messages, effectiveSessionModel, sessionUsageTotal]);

  async function handleSubmit(values: FormValues) {
    const path = values.imageFile?.[0]?.trim() ?? pickedFiles[0]?.trim();
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Image required",
        message: "Choose an image file (PNG, JPEG, WebP, or GIF).",
      });
      return;
    }

    const mediaType = mimeTypeForImagePath(path);
    if (!mediaType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported file",
        message: "Use PNG, JPEG, WebP, or GIF.",
      });
      return;
    }

    const effectiveSm = effectiveModelPreference(prefs.model, setupModelOverride);
    const parsed = parseModelPreference(effectiveSm);
    const prompt = promptText.trim() || defaultPrompt;

    const loading = await showToast({
      style: Toast.Style.Animated,
      title: "Reading file…",
    });

    try {
      const buf = readFileSync(path);
      if (!buf.length) {
        loading.hide();
        await showToast({ style: Toast.Style.Failure, title: "Empty file", message: "The image file is empty." });
        return;
      }
      const base64 = buf.toString("base64");
      loading.title = "Analyzing…";
      const { text: answer, usage } = await analyzeImage(prefs, parsed, base64, prompt, mediaType);

      const thread: ChatTurn[] = [
        { role: "user", content: prompt },
        { role: "assistant", content: answer },
      ];
      setMessages(thread);
      setSession({ source: "screen", screenBase64: base64, screenMediaType: mediaType });
      setSessionModel(effectiveSm);
      setLastRequestUsage(usage ?? null);
      setUsageLedger(usage ? [usage] : []);
      setPhase("chat");
      loading.hide();
      await Clipboard.copy(answer);
      void appendStoredSession({
        title: previewText(prompt, 100),
        source: "screen",
        messages: thread,
        screenBase64: base64,
        screenMediaType: mediaType,
      }).catch(() => {
        /* ignore */
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Response ready",
        message: `Copied to clipboard. Use Continue chat for follow-ups.${formatUsageHint(usage, showTokenUsagePref, { modelValue: effectiveSm, showEstimatedCost: showEstimatedCostPref })}`,
      });
    } catch (err) {
      loading.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Analysis failed",
        message: formatVisionError(err),
      });
    }
  }

  if (phase === "chat" && messages.length > 0 && session) {
    return (
      <ChatThreadList
        navigationTitle={`${EXTENSION_DISPLAY_NAME} · File`}
        messages={messages}
        effectiveSessionModel={effectiveSessionModel}
        lastRequestUsage={lastRequestUsage}
        sessionUsageTotal={sessionUsageTotal}
        usageCallCount={usageLedger.length}
        showTokenUsage={showTokenUsagePref}
        showEstimatedCost={showEstimatedCostPref}
        openReply={openReply}
        copyConversationMarkdown={copyConversationMarkdown}
        exportConversationToFile={exportConversationToFile}
        runRegenerate={runRegenerate}
        openSessionModelPicker={openSessionModelPicker}
        startOver={startOver}
      />
    );
  }

  return (
    <Form
      key={formKey}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Analysis" icon={Icon.Wand} onSubmit={handleSubmit} />
          <Action
            title="Save Instructions as Preset"
            icon={Icon.Plus}
            onAction={() =>
              push(
                <SavePresetForm
                  promptToSave={promptText}
                  onSave={async (title, prompt) => {
                    const trimmed = title.trim();
                    if (!trimmed) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Name required",
                        message: "Enter a name for this preset.",
                      });
                      return;
                    }
                    const before = customPresets.length;
                    const next = await addCustomPreset(trimmed, prompt);
                    setCustomPresets(next);
                    if (next.length > before) {
                      const last = next[next.length - 1];
                      setPresetSelection(`custom:${last.id}`);
                      setPromptText(last.prompt);
                      pop();
                      await showToast({ style: Toast.Style.Success, title: "Preset saved" });
                    } else {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Could not save",
                        message: "Instructions cannot be empty.",
                      });
                    }
                  }}
                />,
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Choose an image file first, then run. API keys and default model: Raycast → Extensions → ${EXTENSION_DISPLAY_NAME} → Preferences.`}
      />
      <Form.FilePicker
        id="imageFile"
        title="Image file"
        value={pickedFiles}
        onChange={setPickedFiles}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="PNG, JPEG, WebP, or GIF."
      />
      <Form.Dropdown
        id="modelForRun"
        title="Model (this run)"
        value={setupModelOverride}
        onChange={setSetupModelOverride}
        info="Overrides the default from preferences for this run only. Follow-ups use this chat’s model until you change it below the conversation."
      >
        <Form.Dropdown.Item value="" title="Default (from preferences)" icon={Icon.Star} />
        {MODEL_PREFERENCE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="promptPreset"
        title="Instruction preset"
        value={presetSelection}
        onChange={(v) => {
          const next = v || PRESET_PREF_DEFAULT;
          setPresetSelection(next);
          const resolved = promptForPresetValue(next, defaultPrompt, customPresets);
          if (resolved !== undefined) {
            setPromptText(resolved);
          }
        }}
      >
        <Form.Dropdown.Item value={PRESET_PREF_DEFAULT} title="Default (from preferences)" icon={Icon.Star} />
        {BUILTIN_PROMPT_PRESETS.map((b) => (
          <Form.Dropdown.Item key={b.id} value={`builtin:${b.id}`} title={b.title} icon={Icon.Text} />
        ))}
        {customPresets.map((c) => (
          <Form.Dropdown.Item key={c.id} value={`custom:${c.id}`} title={c.title} icon={Icon.StarCircle} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Instructions for AI"
        placeholder={defaultPrompt}
        value={promptText}
        onChange={setPromptText}
        info="What you want the model to focus on (OCR, errors, UI review, etc.)."
      />
    </Form>
  );
}
