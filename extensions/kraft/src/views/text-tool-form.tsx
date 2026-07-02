import { Action, ActionPanel, AI, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { CustomTextTool } from "../custom-tools";
import { readModelListCache } from "../hooks/model-cache";
import { useApiSettings } from "../hooks/useApiSettings";
import { promptVariables, promptVariableSummary } from "../prompt-variables";
import { ModelOption, parseRaycastAIModelEnum } from "../runtime/model-list";
import { ToolMode } from "../runtime/types";
import { normalizeToolIconName, toolIconOptions, ToolIconName } from "../tool-icons";
import { defaultWorkflow, ToolRenderer, ToolSetting } from "../tool-settings";

export type TextToolFormValues = {
  id: string;
  icon: ToolIconName;
  title: string;
  subtitle: string;
  description: string;
  model: string;
  customModel: string;
  renderer: ToolRenderer;
  enableConversation: boolean;
  prompt: string;
};

export type TextToolFormTool = CustomTextTool & {
  mode?: ToolMode;
  isSystem?: boolean;
};

export function textToolSettingPatch(values: TextToolFormValues): Partial<ToolSetting> {
  return {
    model: values.model,
    customModel: values.customModel.trim(),
    prompt: values.prompt.trim() || "{{input}}",
    renderer: values.renderer,
    enableConversation: values.enableConversation,
  };
}

export function textToolFromValues(values: TextToolFormValues, current: CustomTextTool, id: string): CustomTextTool {
  return {
    ...current,
    id,
    icon: values.icon,
    title: values.title.trim() || "Untitled Text Tool",
    subtitle: values.subtitle.trim(),
    description: values.description.trim(),
    model: values.model,
    customModel: values.customModel.trim(),
    renderer: values.renderer,
    enableConversation: values.enableConversation,
    prompt: values.prompt.trim() || "{{input}}",
    workflow: current.workflow?.length ? current.workflow : defaultWorkflow,
  };
}

export function TextToolForm({
  tool,
  navigationTitle,
  submitTitle,
  onSubmit,
}: {
  tool: TextToolFormTool;
  navigationTitle: string;
  submitTitle: string;
  onSubmit: (values: TextToolFormValues) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const apiSettings = useApiSettings();
  const [models, setModels] = useState<ModelOption[]>([]);

  useEffect(() => {
    (async () => {
      if (apiSettings.data.apiCompatible === "raycast") {
        setModels(parseRaycastAIModelEnum(AI.Model as Record<string, string>));
        return;
      }

      const cached = await readModelListCache(apiSettings.data);
      setModels(cached?.models ?? []);
    })();
  }, [apiSettings.data]);

  async function submit(values: TextToolFormValues) {
    await onSubmit(values);
    await showToast({
      title: tool.isSystem ? "System text tool updated" : "Text tool saved",
      style: Toast.Style.Success,
    });
    pop();
  }

  return (
    <Form
      isLoading={apiSettings.isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} icon={Icon.Checkmark} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Basic"
        text={
          tool.isSystem
            ? "System tools are built in. You can edit their model, behavior, and prompt, but their identity stays fixed."
            : "Name the tool clearly so it is easy to find from the Kraft menu and input-source picker."
        }
      />
      <Form.TextField id="title" title="Name" defaultValue={tool.title} placeholder="Translate Legal Text" />
      <Form.Dropdown id="icon" title="Icon" defaultValue={normalizeToolIconName(tool.icon)}>
        {toolIconOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="id"
        title="ID"
        defaultValue={tool.id}
        placeholder="translate-legal-text"
        info={tool.isSystem ? "System tool IDs cannot be changed." : undefined}
      />
      <Form.TextField id="subtitle" title="Subtitle" defaultValue={tool.subtitle} placeholder="Shown in tool lists" />
      <Form.TextField id="description" title="Description" defaultValue={tool.description} />
      <Form.Separator />
      <Form.Description
        title="Model"
        text="Leave Model and Custom Model empty to use the default model from API Settings."
      />
      <Form.Dropdown id="model" title="Model" defaultValue={tool.model}>
        <Form.Dropdown.Item value="" title={apiSettings.data.validatedModel || models[0]?.name || "Use API Default"} />
        {models.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="customModel"
        title="Custom Model"
        defaultValue={tool.customModel}
        placeholder="Overrides selected/default model"
      />
      <Form.Separator />
      <Form.Description
        title="Behavior"
        text="Renderer controls display. Conversation controls whether prior turns are included."
      />
      <Form.Dropdown id="renderer" title="Renderer" defaultValue={tool.renderer}>
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="plain" title="Plain Text" />
      </Form.Dropdown>
      <Form.Checkbox
        id="enableConversation"
        title="Conversation"
        label="Enable multi-turn follow-up"
        defaultValue={tool.enableConversation}
      />
      <Form.Separator />
      <Form.Description
        title="Prompt"
        text={`Write the instruction this tool sends to the model. Common variables: ${promptVariableSummary}`}
      />
      <Form.TextArea id="prompt" title="Prompt" defaultValue={tool.prompt} enableMarkdown />
      <Form.Description title="Variables" text="Available prompt variables." />
      {promptVariables.map((variable) => (
        <Form.Description key={variable.name} title={variable.name} text={variable.description} />
      ))}
    </Form>
  );
}
