import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import {
  AI_SERVICES,
  buildPromptUrlRequests,
  openPromptUrlRequests,
  type AIServiceId,
  type ServiceCounts,
} from "./lib/prompt-urls.js";

type FormValues = {
  prompt: string;
} & Record<AIServiceId, string>;

const TAB_OPTIONS = [
  { title: "1 tab", value: "1" },
  { title: "2 tabs", value: "2" },
  { title: "3 tabs", value: "3" },
  { title: "4 tabs", value: "4" },
  { title: "5 tabs", value: "5" },
  { title: "Off", value: "0" },
];

export default function MultiAIChatCommand() {
  const preferences = getPreferenceValues<Preferences.MultiAiChat>();
  const [isLoading, setIsLoading] = useState(false);
  const [promptError, setPromptError] = useState<string>();

  async function handleSubmit(values: FormValues) {
    const prompt = values.prompt ?? "";
    if (!prompt.trim()) {
      setPromptError("Enter a prompt");
      return false;
    }

    const serviceCounts: ServiceCounts = Object.fromEntries(
      AI_SERVICES.map((service) => [
        service.id,
        Number.parseInt(values[service.id] || "0", 10),
      ]),
    );
    const requests = buildPromptUrlRequests(prompt, serviceCounts);
    const totalTabs = requests.length;

    if (totalTabs === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one service",
      });
      return;
    }

    setIsLoading(true);

    await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${totalTabs} tab${totalTabs === 1 ? "" : "s"}…`,
      message: "Sending your prompt through each chat URL",
    });

    try {
      const result = await openPromptUrlRequests(
        requests,
        preferences.browser,
        open,
      );

      if (result.failed > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${result.succeeded}/${result.total} tabs opened`,
          message: result.errors.slice(0, 3).join("; "),
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Opened ${result.succeeded} tab${result.succeeded === 1 ? "" : "s"}`,
        });
        await popToRoot();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Prompt to AI Chats"
            icon={Icon.Airplane}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Type your prompt here…"
        error={promptError}
        onBlur={(event) =>
          setPromptError(
            event.target.value?.trim() ? undefined : "Enter a prompt",
          )
        }
        onChange={() => setPromptError(undefined)}
        autoFocus
      />

      <Form.Description
        title="Delivery"
        text="Opening the query URLs sends the prompt immediately. It may appear in browser history and sync."
      />

      <Form.Separator />

      {AI_SERVICES.map(({ id, name }) => (
        <Form.Dropdown
          key={id}
          id={id}
          title={name}
          defaultValue="1"
          storeValue
        >
          {TAB_OPTIONS.map((option) => (
            <Form.Dropdown.Item
              key={option.value}
              title={option.title}
              value={option.value}
            />
          ))}
        </Form.Dropdown>
      ))}
    </Form>
  );
}
