import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { useModels } from "../hooks/use-models";
import { Preferences } from "../lib/preferences";
import { needsLanguage } from "../lib/session";
import { removeTool, saveTool } from "../lib/storage";
import { providerForTool, Provider } from "../lib/stream";
import {
  builtInTools,
  createToolFromTemplate,
  normalizeBaseUrl,
  Tool,
} from "../lib/tools";

export const languages = [
  "English",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Japanese",
  "Korean",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Arabic",
  "Hindi",
];

export async function confirmDeleteCommand(tool: Tool): Promise<boolean> {
  const builtIn = builtInTools.some((item) => item.id === tool.id);
  if (
    !(await confirmAlert({
      title: `Delete ${tool.title}?`,
      message: builtIn
        ? "Disable this command in Pocket AI. You can restore it with its settings later. Its Raycast shortcut entry remains until disabled in Raycast Settings."
        : "This cannot be undone. If you created a Raycast Quicklink for this command, remove that Quicklink separately.",
      primaryAction: {
        title: "Delete Command",
        style: Alert.ActionStyle.Destructive,
      },
    }))
  ) {
    return false;
  }
  try {
    await removeTool(tool.id);
    await showToast({ style: Toast.Style.Success, title: "Command Deleted" });
    return true;
  } catch (failure) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot Delete Command",
      message: failure instanceof Error ? failure.message : String(failure),
    });
    return false;
  }
}

export default function ToolEditor({
  tool,
  onSave,
  onDelete,
  closeOnSave = true,
}: {
  tool?: Tool;
  onSave: (saved: Tool) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  closeOnSave?: boolean;
}) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [title, setTitle] = useState(tool?.title || "");
  const [templateId, setTemplateId] = useState("");
  const [kind, setKind] = useState(tool?.kind || tool?.id || "");
  const [prompt, setPrompt] = useState(tool?.prompt || builtInTools[0].prompt);
  const defaultTool = builtInTools.find(
    (item) => item.id === (tool?.kind || tool?.id || templateId),
  );
  const [placeholder, setPlaceholder] = useState(tool?.placeholder || "");
  const [followUpPlaceholder, setFollowUpPlaceholder] = useState(
    tool?.followUpPlaceholder || "",
  );
  const [baseUrl, setBaseUrl] = useState(tool?.baseUrl || "");
  const [model, setModel] = useState(tool?.model || "");
  const [language, setLanguage] = useState(tool?.targetLanguage || "");
  const [customLanguage, setCustomLanguage] = useState("");
  const [error, setError] = useState("");
  let provider: Provider = {
    baseUrl: baseUrl || preferences.baseUrl,
    model: "",
  };
  try {
    provider = providerForTool(
      { baseUrl: preferences.baseUrl, model: "", apiKey: preferences.apiKey },
      { baseUrl },
    );
  } catch {
    // Validate the completed endpoint when saving.
  }
  const available = useModels(provider, tool?.model);
  const showLanguage = needsLanguage({
    id: tool?.id || "",
    kind,
    title,
    prompt,
  });
  const choices = [
    ...new Set([
      ...(language && language !== "__custom" ? [language] : []),
      ...languages,
    ]),
  ];

  async function submit() {
    if (!title.trim() || !prompt.trim()) {
      setError("A title and system prompt are required.");
      return;
    }
    if (language === "__custom" && !customLanguage.trim()) {
      setError("Enter your custom target language.");
      return;
    }
    try {
      const saved: Tool = {
        id: tool?.id || randomUUID(),
        title: title.trim(),
        prompt: prompt.trim(),
        kind: kind || undefined,
        placeholder:
          placeholder.trim() ||
          defaultTool?.placeholder ||
          "Type your text, then press Enter...",
        followUpPlaceholder:
          followUpPlaceholder.trim() ||
          defaultTool?.followUpPlaceholder ||
          "Ask a follow-up...",
        baseUrl: baseUrl.trim() ? normalizeBaseUrl(baseUrl) : undefined,
        model: model || undefined,
        targetLanguage: showLanguage
          ? language === "__custom"
            ? customLanguage.trim()
            : language || undefined
          : undefined,
      };
      await saveTool(saved);
      await onSave(saved);
      if (closeOnSave) pop();
      await showToast({
        style: Toast.Style.Success,
        title: "Tool Settings Saved",
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  return (
    <Form
      navigationTitle={tool ? `${tool.title} Settings` : "Add New Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={submit} />
          {defaultTool && (
            <Action
              title="Restore Default Prompt"
              icon={Icon.ArrowClockwise}
              onAction={() => setPrompt(defaultTool.prompt)}
            />
          )}
          {tool && (
            <Action
              title="Delete Command"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                if (await confirmDeleteCommand(tool)) {
                  await onDelete?.();
                  pop();
                }
              }}
            />
          )}
          {defaultTool && (
            <Action
              title="Restore Default Placeholders"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setPlaceholder(defaultTool.placeholder || "");
                setFollowUpPlaceholder(defaultTool.followUpPlaceholder || "");
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {!tool && (
        <Form.Dropdown
          id="template"
          title="Start From Template"
          value={templateId}
          defaultValue={templateId}
          onChange={(value) => {
            if (value === templateId) return;
            setTemplateId(value);
            if (!value) {
              setKind("");
              setTitle("");
              setPrompt(builtInTools[0].prompt);
              setPlaceholder("");
              setFollowUpPlaceholder("");
              setLanguage("");
              return;
            }
            const template = createToolFromTemplate(value, "new-command");
            setKind(template.kind || "");
            setTitle(template.title);
            setPrompt(template.prompt);
            setPlaceholder(template.placeholder || "");
            setFollowUpPlaceholder(template.followUpPlaceholder || "");
            setLanguage("");
          }}
        >
          <Form.Dropdown.Item
            value={templateId}
            title={
              builtInTools.find((item) => item.id === templateId)?.title ||
              "Blank Command"
            }
          />
          {templateId && <Form.Dropdown.Item value="" title="Blank Command" />}
          {builtInTools
            .filter((item) => item.id !== templateId)
            .map((item) => (
              <Form.Dropdown.Item
                key={item.id}
                value={item.id}
                title={item.title}
              />
            ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      {showLanguage && (
        <Form.Dropdown
          id="targetLanguage"
          title="Translate Into"
          value={language}
          defaultValue={language}
          onChange={setLanguage}
        >
          <Form.Dropdown.Item
            value={language}
            title={
              language === "__custom"
                ? "Other Language..."
                : language || "Choose a language..."
            }
          />
          {language && (
            <Form.Dropdown.Item value="" title="Ask Me When I Translate" />
          )}
          {choices
            .filter((item) => item !== language)
            .map((value) => (
              <Form.Dropdown.Item key={value} value={value} title={value} />
            ))}
          {language !== "__custom" && (
            <Form.Dropdown.Item value="__custom" title="Other Language..." />
          )}
        </Form.Dropdown>
      )}
      {showLanguage && language === "__custom" && (
        <Form.TextField
          id="customLanguage"
          title="Target Language"
          value={customLanguage}
          onChange={setCustomLanguage}
          placeholder="For example: Vietnamese"
        />
      )}
      <Form.TextArea
        id="prompt"
        title="System Prompt"
        value={prompt}
        onChange={setPrompt}
        placeholder="Describe this tool's behavior. Use {{language}} for a chosen translation language."
      />
      <Form.TextField
        id="placeholder"
        title="Input Placeholder"
        value={placeholder}
        onChange={setPlaceholder}
        placeholder="Hint shown in this tool's top input bar"
      />
      <Form.TextField
        id="followUpPlaceholder"
        title="Follow-Up Placeholder"
        value={followUpPlaceholder}
        onChange={setFollowUpPlaceholder}
        placeholder="Hint shown after the first message"
      />
      <Form.Dropdown
        id="model"
        title="Model Override"
        value={model}
        defaultValue={model}
        onChange={setModel}
      >
        {model && (
          <Form.Dropdown.Item
            value={model}
            title={
              available.models.find((item) => item.id === model)?.name || model
            }
          />
        )}
        <Form.Dropdown.Item value="" title="Use Last Selected Model" />
        {available.models
          .filter((item) => item.id !== model)
          .map((item) => (
            <Form.Dropdown.Item
              key={item.id}
              value={item.id}
              title={item.name}
            />
          ))}
      </Form.Dropdown>
      <Form.TextField
        id="baseUrl"
        title="API Endpoint Override"
        value={baseUrl}
        onChange={setBaseUrl}
        placeholder="Use the endpoint in Configure AI Provider"
      />
      {available.error && (
        <Form.Description title="Model Discovery" text={available.error} />
      )}
      <Form.Description text="Your API key is configured in Configure AI Provider. A different endpoint origin never receives that key. Placeholders apply to this tool's open input bar; Raycast's root argument hint is fixed by its command manifest." />
      {error && <Form.Description title="Error" text={error} />}
    </Form>
  );
}
