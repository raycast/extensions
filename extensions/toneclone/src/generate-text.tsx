import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  showToast,
  Toast,
  showHUD,
  useNavigation,
  closeMainWindow,
  popToRoot,
  LocalStorage,
  openExtensionPreferences,
  open,
  getFrontmostApplication,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Persona, KnowledgeCard, QueryRequest, QueryPreset } from "./types";
import { saveLastPersona, savePersonaKnowledgeCards, saveAppPersona } from "./preferences";
import { getPersonaIcon } from "./utils/persona";
import { loadInitialData, loadPersonaKnowledgeCards } from "./utils/data-loader";
import { ErrorBoundary } from "./components/ErrorBoundary";

interface GenerateFormValues {
  personaId: string;
  prompt: string;
  knowledgeCardIds: string[];
}

function GenerateForm() {
  const { push } = useNavigation();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultPersona, setDefaultPersona] = useState<string>("");
  const [, setDefaultKnowledgeCards] = useState<string[]>([]);
  const [selectedKnowledgeCards, setSelectedKnowledgeCards] = useState<string[]>([]);
  const [currentPersona, setCurrentPersona] = useState<string>("");
  const [, setActiveApp] = useState<string>("Unknown");
  const [presets, setPresets] = useState<QueryPreset[]>([]);
  const [promptValue, setPromptValue] = useState<string>("");

  const handleSignOut = useCallback(async () => {
    try {
      // Clear stored API key
      await LocalStorage.removeItem("toneclone-api-key");

      // Sign out from OAuth if applicable
      // No additional cleanup needed for simple API key auth

      // Clear API key cache
      api.clearApiKeyCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Signed out",
        message: "You have been signed out of ToneClone",
      });

      // Force reload by navigating back to root
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign out failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  // Handle persona change to load persona-specific knowledge cards
  const handlePersonaChange = useCallback(
    async (newPersonaId: string) => {
      setCurrentPersona(newPersonaId);

      if (newPersonaId) {
        try {
          const { knowledgeCards: newKnowledgeCards, defaultKnowledgeCards: newDefaults } =
            await loadPersonaKnowledgeCards(newPersonaId, personas);
          setKnowledgeCards(newKnowledgeCards || []);
          setDefaultKnowledgeCards(newDefaults || []);
          setSelectedKnowledgeCards(newDefaults || []);
        } catch (error) {
          console.error("Error loading persona knowledge cards:", error);
          setKnowledgeCards([]);
          setDefaultKnowledgeCards([]);
          setSelectedKnowledgeCards([]);
        }
      } else {
        setKnowledgeCards([]);
        setDefaultKnowledgeCards([]);
        setSelectedKnowledgeCards([]);
      }
    },
    [personas],
  );

  const handlePresetSelect = useCallback((preset: QueryPreset) => {
    setPromptValue(preset.prompt);
  }, []);

  // Check if the selected persona is built-in
  const selectedPersona = personas.find((p) => p.personaId === currentPersona);
  const isBuiltInPersona = selectedPersona?.isBuiltIn || false;

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const data = await loadInitialData({
        command: "generate",
        loadKnowledgeCards: true,
      });

      setPersonas(data.personas);
      setPresets(data.presets);
      setActiveApp(data.frontmostApp?.name || "Unknown");

      if (data.selectedPersonaId) {
        setDefaultPersona(data.selectedPersonaId);
        setCurrentPersona(data.selectedPersonaId);
        setKnowledgeCards(data.knowledgeCards || []);
        setDefaultKnowledgeCards(data.defaultKnowledgeCards || []);
        setSelectedKnowledgeCards(data.defaultKnowledgeCards || []);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: error instanceof Error ? error.message : "Please check your API key and internet connection",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = useCallback(
    async (values: GenerateFormValues) => {
      if (!values.personaId || !promptValue.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing Information",
          message: "Please select a persona and enter a prompt to generate text",
        });
        return;
      }

      try {
        setIsSubmitting(true);

        // Save preferences
        await saveLastPersona("generate", values.personaId);
        await savePersonaKnowledgeCards(values.personaId, selectedKnowledgeCards || []);

        // Save per-app persona preference if we can get the frontmost app
        try {
          const frontmostApp = await getFrontmostApplication();
          if (frontmostApp?.name) {
            await saveAppPersona("generate", frontmostApp.name, values.personaId);
          }
        } catch (error) {
          console.warn("Could not save per-app persona preference:", error);
          // Continue anyway
        }

        // Build query request
        const request: QueryRequest = {
          personaId: values.personaId,
          prompt: promptValue,
          // Don't include knowledge cards for built-in personas
          knowledgeCardIds: !isBuiltInPersona && selectedKnowledgeCards.length > 0 ? selectedKnowledgeCards : undefined,
        };

        // Show toast message when generation starts
        await showToast({
          style: Toast.Style.Animated,
          title: "Generating text...",
          message: "Please wait while we create your content",
        });

        const response = await api.generateText(request);

        // Show success toast when generation completes
        await showToast({
          style: Toast.Style.Success,
          title: "Text generated successfully!",
          message: "Your content is ready",
        });

        push(
          <GeneratedTextDetail
            content={response.content}
            prompt={promptValue}
            personaName={personas.find((p) => p.personaId === values.personaId)?.name || "Unknown"}
            personaId={values.personaId}
            knowledgeCardIds={selectedKnowledgeCards}
            personas={personas}
            knowledgeCards={knowledgeCards}
          />,
        );
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Generation Failed",
          message: error instanceof Error ? error.message : "Please check your API key and try again",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [personas, push, promptValue, selectedKnowledgeCards, isBuiltInPersona],
  );

  // Show prompt field immediately, even while loading
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Write with Toneclone"
            onSubmit={handleSubmit}
            icon="✨"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          {(presets || []).length > 0 && (
            <ActionPanel.Section title="Quick Presets">
              {(presets || []).slice(0, 5).map((preset, index) => (
                <Action
                  key={preset.presetId || `preset-${index}`}
                  title={preset.name}
                  onAction={() => handlePresetSelect(preset)}
                  icon="📝"
                  shortcut={{ modifiers: ["cmd"], key: (index + 1).toString() }}
                />
              ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Presets">
            <Action
              title="Manage Presets"
              onAction={() => {
                open("raycast://extensions/jfox/toneclone/manage-presets");
              }}
              icon="📝"
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Account">
            <Action
              title="Sign out"
              onAction={handleSignOut}
              icon="🚪"
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
            />
            <Action
              title="Extension Preferences"
              onAction={openExtensionPreferences}
              icon="⚙️"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Write a professional email to follow up on our meeting..."
        info="Describe what you want to write"
        value={promptValue}
        onChange={setPromptValue}
      />

      {isLoading ? (
        <Form.Description text="Loading personas and knowledge..." />
      ) : personas.length === 0 ? (
        <Form.Description text="No personas found. Visit https://app.toneclone.ai to create your first persona." />
      ) : (
        <>
          <Form.Dropdown
            id="personaId"
            title="Persona"
            defaultValue={defaultPersona}
            onChange={handlePersonaChange}
            info="Select the writing persona to use for generation"
          >
            {(personas || []).map((persona, index) => (
              <Form.Dropdown.Item
                key={persona.personaId || `persona-${index}`}
                value={persona.personaId}
                title={persona.name}
                icon={getPersonaIcon(persona)}
              />
            ))}
          </Form.Dropdown>

          {!isBuiltInPersona && knowledgeCards.length > 0 && (
            <Form.TagPicker
              key={`knowledgeCards-${currentPersona}-${knowledgeCards.length}`}
              id="knowledgeCardIds"
              title="Knowledge"
              value={selectedKnowledgeCards}
              onChange={setSelectedKnowledgeCards}
              info="Knowledge cards to apply"
            >
              {(knowledgeCards || []).map((knowledgeCard, index) => (
                <Form.TagPicker.Item
                  key={knowledgeCard.knowledgeCardId || `knowledgeCard-${index}`}
                  value={knowledgeCard.knowledgeCardId}
                  title={knowledgeCard.name}
                />
              ))}
            </Form.TagPicker>
          )}

          {!isBuiltInPersona && knowledgeCards.length === 0 && !isLoading && (
            <Form.Description text="No knowledge cards available for this persona." />
          )}
        </>
      )}
    </Form>
  );
}

function GeneratedTextDetail({
  content,
  prompt,
  personaName,
  personaId,
  knowledgeCardIds,
  personas,
  knowledgeCards,
}: {
  content: string;
  prompt: string;
  personaName: string;
  personaId: string;
  knowledgeCardIds: string[];
  personas: Persona[];
  knowledgeCards: KnowledgeCard[];
}) {
  const { push } = useNavigation();
  const [editableContent, setEditableContent] = useState(content);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopyAndClose = useCallback(async () => {
    await Clipboard.copy(editableContent);
    await showHUD("✅ Copied to Clipboard");
    await closeMainWindow();
    await popToRoot();
  }, [editableContent]);

  const handleRegenerateWithPrompt = useCallback(
    async (
      regeneratePrompt: string,
      selectedPersonaId?: string,
      selectedKnowledgeCardIds?: string[],
    ): Promise<string> => {
      try {
        setIsRegenerating(true);

        // Show toast message when regeneration starts
        await showToast({
          style: Toast.Style.Animated,
          title: "Regenerating text...",
          message: "Please wait while we create your content",
        });

        // Use provided persona and knowledge cards, or fall back to the original ones
        const personaToUse = selectedPersonaId || personaId;
        const knowledgeCardsToUse = selectedKnowledgeCardIds || knowledgeCardIds;

        // Check if the persona being used is built-in
        const personaForRegeneration = personas.find((p) => p.personaId === personaToUse);
        const isBuiltInForRegeneration = personaForRegeneration?.isBuiltIn || false;

        // Build query request using the current content as context
        const request: QueryRequest = {
          personaId: personaToUse,
          prompt: regeneratePrompt,
          // Don't include knowledge cards for built-in personas
          knowledgeCardIds:
            !isBuiltInForRegeneration && knowledgeCardsToUse.length > 0 ? knowledgeCardsToUse : undefined,
          document: editableContent, // Include the current draft in the textarea
        };

        const response = await api.generateText(request);

        // Show success toast when regeneration completes
        await showToast({
          style: Toast.Style.Success,
          title: "Text regenerated successfully!",
          message: "Your content has been updated",
        });

        // Update the content with the new generated text
        setEditableContent(response.content);
        return response.content;
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Regeneration Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        throw error; // Re-throw so the calling function can handle it
      } finally {
        setIsRegenerating(false);
      }
    },
    [personaId, knowledgeCardIds, editableContent],
  );

  const handleMakeShorter = useCallback(async () => {
    await handleRegenerateWithPrompt(
      "Rewrite this content to be shorter and more concise while maintaining the key message.",
    );
  }, [handleRegenerateWithPrompt]);

  const handleMakeLonger = useCallback(async () => {
    await handleRegenerateWithPrompt(
      "Expand this content with more detail, context, and elaboration while maintaining the same tone and style.",
    );
  }, [handleRegenerateWithPrompt]);

  const handleRewrite = useCallback(async () => {
    await handleRegenerateWithPrompt(
      "Rewrite this content in a different way while keeping the same meaning and improving the flow.",
    );
  }, [handleRegenerateWithPrompt]);

  const handleImproveClarity = useCallback(async () => {
    await handleRegenerateWithPrompt(
      "Improve the clarity and readability of this content. Make it easier to understand while maintaining the same meaning.",
    );
  }, [handleRegenerateWithPrompt]);

  const handleCustomPrompt = useCallback(async () => {
    // Navigate to a custom prompt form
    push(
      <CustomPromptForm
        onPromptSubmit={handleRegenerateWithPrompt}
        currentContent={editableContent}
        personaId={personaId}
        knowledgeCardIds={knowledgeCardIds}
        personas={personas}
        knowledgeCards={knowledgeCards}
        onSuccess={(newContent) => {
          setEditableContent(newContent);
        }}
      />,
    );
  }, [
    push,
    handleRegenerateWithPrompt,
    editableContent,
    personaName,
    personaId,
    knowledgeCardIds,
    personas,
    knowledgeCards,
  ]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Copy and Close"
            onAction={handleCopyAndClose}
            icon="✅"
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
          <Action
            title="Copy to Clipboard"
            onAction={() => Clipboard.copy(editableContent)}
            icon="📋"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Copy Original"
            onAction={() => Clipboard.copy(content)}
            icon="📄"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />

          <ActionPanel.Section title="Regenerate Content">
            <Action title="Rewrite" onAction={handleRewrite} icon="🔄" shortcut={{ modifiers: ["cmd"], key: "1" }} />
            <Action
              title="Custom Prompt"
              onAction={handleCustomPrompt}
              icon="💬"
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action
              title="Make Shorter"
              onAction={handleMakeShorter}
              icon="✂️"
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action
              title="Make Longer"
              onAction={handleMakeLonger}
              icon="➕"
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />

            <Action
              title="Improve Clarity"
              onAction={handleImproveClarity}
              icon="👁️"
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isRegenerating}
    >
      <Form.Description title="Generated Text" text={`Persona: ${personaName} | Prompt: ${prompt}`} />

      <Form.TextArea
        id="content"
        title="Content (Editable)"
        placeholder="Generated content will appear here..."
        value={editableContent}
        onChange={setEditableContent}
        info="You can edit this text before copying it, or use the regenerate actions below"
      />
    </Form>
  );
}

function CustomPromptForm({
  onPromptSubmit,
  currentContent,
  personaId,
  knowledgeCardIds,
  personas,
  knowledgeCards,
  onSuccess,
}: {
  onPromptSubmit: (prompt: string, selectedPersonaId: string, selectedKnowledgeCardIds: string[]) => Promise<string>;
  currentContent: string;
  personaId: string;
  knowledgeCardIds: string[];
  personas: Persona[];
  knowledgeCards: KnowledgeCard[];
  onSuccess: (newContent: string) => void;
}) {
  const { pop } = useNavigation();
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState(personaId);
  const [selectedKnowledgeCardIds, setSelectedKnowledgeCardIds] = useState(knowledgeCardIds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!customPrompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please enter a custom prompt",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const newContent = await onPromptSubmit(customPrompt.trim(), selectedPersonaId, selectedKnowledgeCardIds);
      onSuccess(newContent);
      pop(); // Go back to the GeneratedTextDetail view
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom Prompt Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [customPrompt, onPromptSubmit, onSuccess, pop]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Custom Prompt" onSubmit={handleSubmit} icon="✨" />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextArea
        id="customPrompt"
        title="What do you want to change?"
        placeholder="e.g., Make this more formal and professional, Add a conclusion section, Rewrite in a more casual tone..."
        info="Describe how you want to modify the current content"
        value={customPrompt}
        onChange={setCustomPrompt}
      />

      <Form.Dropdown
        id="personaId"
        title="Persona"
        value={selectedPersonaId}
        onChange={setSelectedPersonaId}
        info="Select the writing persona to use for regeneration"
      >
        {(personas || []).map((persona, index) => (
          <Form.Dropdown.Item
            key={persona.personaId || `persona-${index}`}
            value={persona.personaId}
            title={persona.name}
            icon={getPersonaIcon(persona)}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="knowledgeCardIds"
        title="Knowledge"
        value={selectedKnowledgeCardIds}
        onChange={setSelectedKnowledgeCardIds}
        info="Knowledge cards to apply"
      >
        {(knowledgeCards || []).map((knowledgeCard, index) => (
          <Form.TagPicker.Item
            key={knowledgeCard.knowledgeCardId || `knowledgeCard-${index}`}
            value={knowledgeCard.knowledgeCardId}
            title={knowledgeCard.name}
          />
        ))}
      </Form.TagPicker>

      <Form.TextArea
        id="currentContent"
        title="Current Content (Read-only)"
        value={currentContent}
        info="Full content that will be modified (scrollable)"
        onChange={() => {}} // Prevent changes by providing empty handler
      />
    </Form>
  );
}

function Command() {
  return (
    <ErrorBoundary fallbackTitle="Text Generation Error">
      <GenerateForm />
    </ErrorBoundary>
  );
}

export default Command;
