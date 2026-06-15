import {
  Action,
  ActionPanel,
  Form,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";

type CreateTaskResponse = {
  task_id: string;
  task_url?: string;
};

type FormValues = {
  prompt: string;
  agentProfile: string;
  mode: string;
};

const API_BASE_URL = "https://api.manus.ai/v1/tasks";
const TASK_URL_BASE = "https://manus.im/app";
const DEFAULT_AGENT_PROFILE = "manus-1.6";
const AGENT_PROFILES = ["manus-1.6", "manus-1.6-lite", "manus-1.6-max"];
const DEFAULT_MODE = "adaptive";
const MODES = [
  { value: "chat", title: "Chat" },
  { value: "adaptive", title: "Auto" },
  { value: "agent", title: "Agent" },
];

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    value: agentProfile,
    setValue: setAgentProfile,
    isLoading: isLoadingAgent,
  } = useLocalStorage("agentProfile", DEFAULT_AGENT_PROFILE);
  const {
    value: mode,
    setValue: setMode,
    isLoading: isLoadingMode,
  } = useLocalStorage("mode", DEFAULT_MODE);
  const isLoading = isLoadingAgent || isLoadingMode;

  const handleSubmit = async (values: FormValues) => {
    const prompt = values.prompt?.trim();
    if (!prompt) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Prompt is required",
      });
      return;
    }
    if (!apiKey) {
      await showToast({ style: Toast.Style.Failure, title: "Missing API Key" });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task",
    });
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          API_KEY: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          agentProfile:
            values.agentProfile || agentProfile || DEFAULT_AGENT_PROFILE,
          mode: values.mode || mode || DEFAULT_MODE,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed (${response.status})`);
      }

      const data = (await response.json()) as CreateTaskResponse;
      const taskUrl = data.task_url ?? `${TASK_URL_BASE}/${data.task_id}`;

      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      toast.message = "Ready to open";
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => open(taskUrl),
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Instructions"
        placeholder="Describe what you want Manus to do..."
        autoFocus
      />
      {!isLoading && (
        <>
          <Form.Dropdown
            id="agentProfile"
            title="Agent"
            value={agentProfile}
            onChange={(v) => void setAgentProfile(v)}
          >
            {AGENT_PROFILES.map((profile) => (
              <Form.Dropdown.Item
                key={profile}
                title={profile}
                value={profile}
              />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="mode"
            title="Mode"
            value={mode}
            onChange={(v) => void setMode(v)}
          >
            {MODES.map((modeOption) => (
              <Form.Dropdown.Item
                key={modeOption.value}
                title={modeOption.title}
                value={modeOption.value}
              />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
