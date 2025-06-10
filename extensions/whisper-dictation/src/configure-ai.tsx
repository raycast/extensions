import {
  ActionPanel,
  Action,
  Form,
  Icon,
  environment,
  Toast,
  showToast,
  LocalStorage,
  openExtensionPreferences,
  Color,
  List,
  confirmAlert,
  Alert,
  getPreferenceValues,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { useCallback, useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { fetch } from "cross-fetch";

// Keys for LocalStorage to store prompt configs
const AI_PROMPTS_KEY = "aiPrompts";
const ACTIVE_PROMPT_ID_KEY = "activePromptId";

type APIStatus = "checking" | "online" | "offline";

interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
}

// Main component for configuring AI prompts
export default function ConfigureAI() {
  // Check if user has access to Raycast AI features
  const canAccessAI = environment.canAccess("AI");
  // Get prefs
  const preferences = getPreferenceValues<Preferences>();
  // State for storing list of AI prompts
  const [prompts, setPrompts] = useCachedState<AIPrompt[]>("aiPrompts", [
    {
      id: "default",
      name: "Email Format",
      prompt:
        "Reformat this dictation as a professional email. Keep all facts and information from the original text, keep the wording similar just reformat and fix any grammatical errors. Add appropriate greeting and signature if needed, but don't include a subject line.",
    },
    {
      id: "bullet",
      name: "Bullet Points",
      prompt:
        "Convert this dictation into concise bullet points. Provide just the bullet points and nothing else. Preserve all key information.",
    },
    {
      id: "formal",
      name: "Formal Writing",
      prompt:
        "Rewrite this dictation in formal language suitable for professional documentation. Correct grammar and improve sentence structure while preserving all information.",
    },
    {
      id: "command",
      name: "Generate Shell Command",
      prompt:
        "Return a zsh shell command based on the description provided within the prompt. The command should be precise, follow best practices. If using any non-default packages, assume the user has that package installed already. Use the best package for the job. Only provide the command, absolutely nothing else.",
    },
    {
      id: "fix",
      name: "Fix transcription errors",
      prompt:
        "Your ONLY job is to fix any spelling, grammar, and transcription mistakes in the transcription given to you along with this prompt. Whisper can sometimes mishear certain words so use your common sense to try and fix these errors. Do not add any information or add any questions, do not add any unecessary punctuation such as wrapping the text in quotes, just return the fixed, coherent text. If the text to be fixed is a question do not answer the question, just fix any mistakes in the question itself.",
    },
    {
      id: "table",
      name: "Make Markdown Table",
      prompt:
        "Create a markdown table from the information given. Provide only the table and absolutely nothing else. Do not include it within a markdown code block (e.g.``` {table} ```) Add no additional commentary, just a clear, well formatted markdown table.",
    },
  ]);

  // Currently active prompt ID
  const [activePromptId, setActivePromptId] = useCachedState<string>(ACTIVE_PROMPT_ID_KEY, "default");
  // Controls visibility of add/edit prompt form
  const [isShowingPromptForm, setIsShowingPromptForm] = useState(false);
  // State to hold prompt being edited
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  // State to check if API is online
  const [ollamaStatus, setOllamaStatus] = useState<APIStatus>("checking");

  // Save the prompts list whenever it changes
  useEffect(() => {
    LocalStorage.setItem(AI_PROMPTS_KEY, JSON.stringify(prompts));
  }, [prompts]);

  // Save active prompt ID whenever it changes
  useEffect(() => {
    LocalStorage.setItem(ACTIVE_PROMPT_ID_KEY, activePromptId);
  }, [activePromptId]);

  // Callback function to set prompt as active
  const handleSetActivePrompt = useCallback(
    (id: string) => {
      setActivePromptId(id);
      showToast({
        style: Toast.Style.Success,
        title: "Active prompt updated",
      });
    },
    [setActivePromptId],
  );

  useEffect(() => {
    if (preferences.aiRefinementMethod === "ollama") {
      setOllamaStatus("checking");

      const controller = new AbortController();
      // 5 second timeout
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Checks ollama first
      fetch(preferences.ollamaEndpoint, { signal: controller.signal })
        .then((response) => {
          if (response.ok || response.status === 405) {
            clearTimeout(timeoutId);
            finishProgress(true);
          } else {
            // If Ollama check fails, try external endpoint
            tryExternalAPICheck();
          }
        })
        .catch(() => {
          // If Ollama check throws error, do the same
          tryExternalAPICheck();
        });

      // Function for external API check
      function tryExternalAPICheck() {
        const modelsEndpoint = `${preferences.ollamaEndpoint.replace(/\/+$/, "")}/v1/models`;
        const headers: HeadersInit = {};

        if (preferences.ollamaApiKey) {
          headers["Authorization"] = `Bearer ${preferences.ollamaApiKey}`;
        }

        fetch(modelsEndpoint, {
          signal: controller.signal,
          headers,
        })
          .then((response) => {
            clearTimeout(timeoutId);
            finishProgress(response.ok);
          })
          .catch(() => {
            clearTimeout(timeoutId);
            finishProgress(false);
          });
      }

      // Helper to set final status
      function finishProgress(success: boolean) {
        // Set the connection status
        setOllamaStatus(success ? "online" : "offline");
      }

      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    }
  }, [preferences.aiRefinementMethod, preferences.ollamaEndpoint, preferences.ollamaApiKey]);

  // Handle deleting a prompt
  const handleDeletePrompt = useCallback(
    async (promptToDelete: AIPrompt) => {
      // Confirm deletion
      const shouldDelete = await confirmAlert({
        title: "Delete Prompt",
        message: `Are you sure you want to delete "${promptToDelete.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (shouldDelete) {
        // Filter out prompt to be deleted
        const updatedPrompts = prompts.filter((p) => p.id !== promptToDelete.id);
        setPrompts(updatedPrompts);

        // If deleted prompt active, set first prompt in list as active
        if (activePromptId === promptToDelete.id && updatedPrompts.length > 0) {
          setActivePromptId(updatedPrompts[0].id);
        } else if (updatedPrompts.length === 0) {
          // If no prompts left, clear active ID
          setActivePromptId("");
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Prompt deleted",
        });
      }
    },
    [prompts, setPrompts, activePromptId, setActivePromptId],
  );

  // Save a new or edited prompt
  const handleSavePrompt = useCallback(
    (newPrompt: AIPrompt) => {
      if (editingPrompt) {
        // Update existing prompt
        setPrompts(prompts.map((p) => (p.id === editingPrompt.id ? newPrompt : p)));
      } else {
        // Add new prompt
        setPrompts([...prompts, newPrompt]);
      }
      // Hide form and reset editing state
      setIsShowingPromptForm(false);
      setEditingPrompt(null);
      showToast({
        style: Toast.Style.Success,
        title: editingPrompt ? "Prompt updated" : "Prompt added",
      });
    },
    [prompts, setPrompts, editingPrompt],
  );

  // If Raycast AI not accessible, show empty view prompting for Pro
  if (!canAccessAI && preferences.aiRefinementMethod === "raycast") {
    return (
      <List navigationTitle="Configure AI Refinement" searchBarPlaceholder="">
        <List.EmptyView
          icon={{ source: Icon.Stars, tintColor: Color.Red }}
          title="Raycast Pro Required for Raycast AI"
          description="AI refinement using Raycast AI requires Raycast Pro. You can still use Ollama or disable AI refinement."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Learn More About Pro" url="https://www.raycast.com/pro" />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isShowingPromptForm) {
    return (
      <Form
        navigationTitle={editingPrompt ? "Edit Prompt" : "Add Prompt"}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={editingPrompt ? "Update Prompt" : "Add Prompt"}
              onSubmit={(values) => {
                if (!values.name || !values.prompt) {
                  showToast({ style: Toast.Style.Failure, title: "Name and Prompt cannot be empty" });
                  return;
                }
                const newPrompt: AIPrompt = {
                  id: editingPrompt ? editingPrompt.id : Date.now().toString(),
                  name: values.name,
                  prompt: values.prompt,
                };
                handleSavePrompt(newPrompt);
              }}
            />
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={() => {
                setIsShowingPromptForm(false);
                setEditingPrompt(null);
              }}
              shortcut={{ modifiers: ["cmd"], key: "escape" }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="name"
          title="Name"
          placeholder="E.g., Meeting Notes Format"
          defaultValue={editingPrompt?.name}
          autoFocus
        />
        <Form.TextArea
          id="prompt"
          title="Prompt"
          placeholder="Instructions for how AI should refine the transcription..."
          defaultValue={editingPrompt?.prompt}
        />
        <Form.Description
          title="Prompt Tips"
          text="Write clear instructions for how the AI should process the transcription. The transcribed text will be provided to the AI along with this prompt."
        />
      </Form>
    );
  }

  return (
    <List navigationTitle="Configure AI Refinement" searchBarPlaceholder="Search prompts...">
      <List.Section title="AI Refinement Status">
        <List.Item
          icon={
            preferences.aiRefinementMethod !== "disabled"
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.XMarkCircle, tintColor: Color.Red }
          }
          title={
            preferences.aiRefinementMethod === "disabled"
              ? "AI Refinement Disabled"
              : preferences.aiRefinementMethod === "raycast"
                ? "Using Raycast AI"
                : preferences.aiRefinementMethod === "ollama"
                  ? "Using Ollama/API"
                  : "Using OpenAI-Compatible API"
          }
          subtitle={
            preferences.aiRefinementMethod === "disabled"
              ? "Enable in preferences to use AI refinement"
              : preferences.aiRefinementMethod === "raycast"
                ? `Model: ${preferences.aiModel.replace("OpenAI_", "").replace("Anthropic_", "")}` // Clean up model name
                : `Model: ${preferences.ollamaModel}`
          }
          accessories={[
            {
              tag: {
                value: preferences.aiRefinementMethod !== "disabled" ? "Enabled" : "Disabled",
                color: preferences.aiRefinementMethod !== "disabled" ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  openExtensionPreferences();
                  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                }}
              />
            </ActionPanel>
          }
        />
        {preferences.aiRefinementMethod === "ollama" && (
          <List.Item
            icon={{ source: Icon.Network }}
            title="AI Endpoint"
            subtitle={preferences.ollamaEndpoint}
            accessories={[
              ollamaStatus === "checking"
                ? {
                    tag: { value: "Checking...", color: Color.SecondaryText },
                  }
                : ollamaStatus === "online"
                  ? { tag: { value: "Connected", color: Color.Green } }
                  : { tag: { value: "Disconnected", color: Color.Red } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={() => {
                    openExtensionPreferences();
                    closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Your Prompts">
        {prompts.map((prompt) => (
          <List.Item
            key={prompt.id}
            icon={
              activePromptId === prompt.id
                ? { source: Icon.Checkmark, tintColor: Color.Green } // Green check if active
                : { source: Icon.Document }
            }
            title={prompt.name}
            subtitle={prompt.prompt.length > 50 ? `${prompt.prompt.substring(0, 50)}...` : prompt.prompt} // Truncate long prompts
            accessories={[...(activePromptId === prompt.id ? [{ tag: { value: "Active", color: Color.Green } }] : [])]}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Active Prompt"
                  icon={Icon.Checkmark}
                  onAction={() => handleSetActivePrompt(prompt.id)}
                />
                <Action
                  title="Edit Prompt"
                  icon={Icon.Pencil}
                  onAction={() => {
                    setEditingPrompt(prompt);
                    setIsShowingPromptForm(true);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Delete Prompt"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeletePrompt(prompt)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={() => {
                    openExtensionPreferences();
                    closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.SecondaryText }}
          title="Add New Prompt"
          actions={
            <ActionPanel>
              <Action
                title="Add New Prompt"
                icon={Icon.Plus}
                onAction={() => {
                  setIsShowingPromptForm(true);
                  setEditingPrompt(null);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
