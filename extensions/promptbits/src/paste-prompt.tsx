import {
  List,
  Form,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  Icon,
  useNavigation,
  popToRoot,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { usePrompts } from "./hooks/usePrompts";
import { processTemplate } from "./lib/template-service";
import type { Prompt, PromptArgument } from "./lib/types";

export default function PastePromptCommand() {
  const { data: prompts, isLoading, error, mutate } = usePrompts();
  const [searchText, setSearchText] = useState("");

  const filteredPrompts =
    prompts?.filter(
      (prompt) =>
        prompt.name.toLowerCase().includes(searchText.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchText.toLowerCase()),
    ) ?? [];

  const isAuthError = error?.message.includes("API key") || error?.message.includes("401");

  async function handleRefresh() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing prompts..." });
    try {
      await mutate();
      toast.style = Toast.Style.Success;
      toast.title = "Prompts refreshed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to refresh";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts..."
    >
      {error ? (
        <List.EmptyView
          icon={isAuthError ? Icon.Key : Icon.ExclamationMark}
          title={isAuthError ? "Invalid API Key" : "Failed to Load Prompts"}
          description={isAuthError ? "Please check your API key in extension preferences" : error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action
                title="Refresh Prompts"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : filteredPrompts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No prompts found"
          description={prompts?.length === 0 ? "Create prompts in PromptBits to get started" : "Try a different search"}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Prompts"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredPrompts.map((prompt) => <PromptListItem key={prompt.id} prompt={prompt} onRefresh={handleRefresh} />)
      )}
    </List>
  );
}

function PromptListItem({ prompt, onRefresh }: { prompt: Prompt; onRefresh: () => void }) {
  const { push } = useNavigation();
  const hasArguments = prompt.arguments && prompt.arguments.length > 0;

  async function pastePrompt() {
    try {
      await Clipboard.paste(prompt.content);
      await Clipboard.copy(prompt.content);
      await showToast({
        style: Toast.Style.Success,
        title: "Prompt pasted!",
        message: prompt.name,
      });
      await popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function handleSelect() {
    if (hasArguments) {
      push(<ArgumentsForm prompt={prompt} />);
    } else {
      pastePrompt();
    }
  }

  return (
    <List.Item
      title={prompt.name}
      subtitle={prompt.description}
      accessories={hasArguments ? [{ icon: Icon.TextInput, tooltip: `${prompt.arguments.length} argument(s)` }] : []}
      actions={
        <ActionPanel>
          <Action
            title={hasArguments ? "Fill Arguments" : "Paste Prompt"}
            icon={Icon.Clipboard}
            onAction={handleSelect}
          />
          <Action
            title="Copy to Clipboard"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(prompt.content);
              await showToast({ style: Toast.Style.Success, title: "Copied!", message: prompt.name });
            }}
          />
          <Action
            title="Refresh Prompts"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function ArgumentsForm({ prompt }: { prompt: Prompt }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function validateForm(): boolean {
    const newErrors: Record<string, string | undefined> = {};
    let isValid = true;

    for (const arg of prompt.arguments) {
      if (arg.required && !values[arg.name]?.trim()) {
        newErrors[arg.name] = "This field is required";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      await showToast({ style: Toast.Style.Failure, title: "Please fill in required fields" });
      return;
    }

    try {
      const finalContent = processTemplate(prompt.content, values);
      await Clipboard.paste(finalContent);
      await Clipboard.copy(finalContent);
      await showToast({ style: Toast.Style.Success, title: "Prompt pasted!", message: prompt.name });
      await popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function updateValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Paste Prompt" icon={Icon.Clipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={prompt.name} />
      <Form.Separator />
      {prompt.arguments.map((arg: PromptArgument) => (
        <Form.TextField
          key={arg.name}
          id={arg.name}
          title={arg.name}
          placeholder={arg.description || `Enter ${arg.name}`}
          info={arg.description}
          error={errors[arg.name]}
          value={values[arg.name] || ""}
          onChange={(value) => updateValue(arg.name, value)}
        />
      ))}
    </Form>
  );
}
