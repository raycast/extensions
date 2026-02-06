import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface ActionConfig {
  title: string;
  prompt: string;
}

const DEFAULT_CONFIGS: Record<string, ActionConfig> = {
  "action-1": {
    title: "Fix Grammar",
    prompt:
      "Fix all typos, spelling errors, and grammar issues in the following text. Return only the corrected text without any explanation:",
  },
  "action-2": {
    title: "Make Concise",
    prompt:
      "Make the following text more concise while preserving the key meaning. Return only the rewritten text without explanation:",
  },
  "action-3": {
    title: "Create List",
    prompt:
      "Convert the following text into a clean bullet point list. Return only the list without explanation:",
  },
  "action-4": {
    title: "Make Professional",
    prompt:
      "Rewrite the following text to be more professional and polished, suitable for business communication. Return only the rewritten text without explanation:",
  },
  "action-5": {
    title: "Simplify",
    prompt:
      "Simplify the following text to make it easier to understand. Use simpler words and shorter sentences. Return only the simplified text without explanation:",
  },
};

export default function Command(
  props: LaunchProps<{ arguments: { actionId: string } }>,
) {
  const { actionId } = props.arguments;
  const { pop } = useNavigation();
  const [config, setConfig] = useState<ActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!actionId) return;

      const prefs = getPreferenceValues();
      let currentConfig: ActionConfig = {
        title:
          (prefs.title as string) ||
          DEFAULT_CONFIGS[actionId]?.title ||
          actionId,
        prompt:
          (prefs.prompt as string) || DEFAULT_CONFIGS[actionId]?.prompt || "",
      };

      try {
        const saved = await LocalStorage.getItem<string>("action-configs");
        if (saved) {
          const configs = JSON.parse(saved);
          if (configs[actionId]) {
            currentConfig = { ...currentConfig, ...configs[actionId] };
          }
        }
      } catch (e) {
        console.error("Failed to load configs", e);
      }

      setConfig(currentConfig);
      setIsLoading(false);
    }

    init();
  }, [actionId]);

  async function handleSave(values: { title: string; prompt: string }) {
    try {
      const saved = await LocalStorage.getItem<string>("action-configs");
      const configs = saved ? JSON.parse(saved) : {};
      configs[actionId] = values;
      await LocalStorage.setItem("action-configs", JSON.stringify(configs));
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration saved!",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(error),
      });
    }
  }

  if (isLoading || !config) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Close" onSubmit={handleSave} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`Editing ${config.title}`}
        text="Modify the prompt and title. Multiline is supported here."
      />
      <Form.TextField id="title" title="Title" defaultValue={config.title} />
      <Form.TextArea id="prompt" title="Prompt" defaultValue={config.prompt} />
    </Form>
  );
}
