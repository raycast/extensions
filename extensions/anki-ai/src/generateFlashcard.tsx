import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, Detail } from "@raycast/api";
import { useFlashcardGenerator } from "./hooks/useFlashcardGenerator";
import { FlashcardPreview } from "./components/FlashcardPreview";
import { Flashcard } from "./ai/flashcardGenerator";
import { ErrorHandler } from "./utils/errorHandler";
import { AnkiRepository } from "./anki/ankiRepository";
import { AIModelEnum } from "./constants/aiModels";
import PreferencesCommand from "./preferences";

// Form to edit a flashcard
function EditFlashcardForm({ flashcard, onSave }: { flashcard: Flashcard; onSave: (updatedCard: Flashcard) => void }) {
  const { pop } = useNavigation();
  const [frontText, setFrontText] = useState(flashcard.front);
  const [backText, setBackText] = useState(flashcard.back);
  const [extraText, setExtraText] = useState(flashcard.extra || "");
  const [imageUrl, setImageUrl] = useState(flashcard.image || "");
  const [tagsText, setTagsText] = useState(flashcard.tags ? flashcard.tags.join(", ") : "");

  const handleSubmit = () => {
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    onSave({
      front: frontText,
      back: backText,
      extra: extraText,
      image: imageUrl || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="front"
        title="Front"
        placeholder="Question or concept"
        value={frontText}
        onChange={setFrontText}
      />
      <Form.TextArea
        id="back"
        title="Back"
        placeholder="Answer or explanation"
        value={backText}
        onChange={setBackText}
      />
      <Form.TextArea
        id="extra"
        title="Extra Information"
        placeholder="Additional information, examples, or context"
        value={extraText}
        onChange={setExtraText}
      />
      <Form.TextField
        id="image"
        title="Image URL (optional)"
        placeholder="https://example.com/image.jpg"
        value={imageUrl}
        onChange={setImageUrl}
      />
      <Form.TextField
        id="tags"
        title="Tags (optional)"
        placeholder="Separate tags with commas"
        value={tagsText}
        onChange={setTagsText}
      />
    </Form>
  );
}

// Form to configure export to Anki
function ExportToAnkiForm({
  flashcards,
  decks,
  onExport,
}: {
  flashcards: Flashcard[];
  decks: string[];
  onExport: (flashcards: Flashcard[], deckName: string, modelName: string, tags: string[]) => void;
}) {
  const [selectedDeck, setSelectedDeck] = useState(decks[0] || "");
  const [selectedModel, setSelectedModel] = useState("Raycast Flashcards");
  const [tagsText, setTagsText] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelFields, setModelFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const { pop } = useNavigation();

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      loadModelFields(selectedModel);
    }
  }, [selectedModel]);

  const loadModels = async () => {
    try {
      const response = await AnkiRepository.modelNames();
      if (!response.error && response.result) {
        setModels(response.result);
        // Add "Raycast Flashcards" to the list if it doesn't exist
        if (!response.result.includes("Raycast Flashcards")) {
          setModels((prev) => [...prev, "Raycast Flashcards"]);
        }
        // Use "Raycast Flashcards" as default
        setSelectedModel("Raycast Flashcards");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading models",
        message: "Make sure Anki is open",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadModelFields = async (modelName: string) => {
    try {
      const response = await AnkiRepository.modelFieldNames(modelName);
      if (!response.error && response.result) {
        setModelFields(response.result);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading model fields",
        message: "Make sure Anki is open",
      });
    }
  };

  const handleSubmit = () => {
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    onExport(flashcards, selectedDeck, selectedModel, tags);
    pop();
  };

  const previewFields = () => {
    if (flashcards.length === 0 || modelFields.length === 0) return null;

    // Get the first flashcard as an example
    const example = flashcards[0];
    return (
      <Form.Description
        text={`
Model fields for "${selectedModel}":
${modelFields
  .map((field) => {
    let value = "";
    const fieldLower = field.toLowerCase();
    if (
      fieldLower.includes("front") ||
      fieldLower.includes("question") ||
      fieldLower.includes("frente") ||
      fieldLower.includes("pergunta")
    ) {
      value = example.front;
    } else if (
      fieldLower.includes("back") ||
      fieldLower.includes("answer") ||
      fieldLower.includes("verso") ||
      fieldLower.includes("resposta")
    ) {
      value = example.back;
    } else if (fieldLower.includes("extra") || fieldLower.includes("note") || fieldLower.includes("nota")) {
      value = example.extra || "";
    }
    return `${field}: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""}`;
  })
  .join("\n")}
      `}
      />
    );
  };

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (showPreview) {
    return (
      <Detail
        navigationTitle="Flashcard Export Preview"
        markdown={`
# Flashcard Export Preview

## Settings
- **Deck**: ${selectedDeck}
- **Model**: ${selectedModel}
- **Tags**: ${tagsText || "None"}

## Flashcards (${flashcards.length})
${flashcards
  .map(
    (card, index) => `
### Flashcard ${index + 1}

**Front**: ${card.front}

**Back**: ${card.back}

${card.extra ? `**Extra**: ${card.extra}` : ""}
${card.tags && card.tags.length > 0 ? `**Tags**: ${card.tags.join(", ")}` : ""}
---`,
  )
  .join("\n")}
        `}
        actions={
          <ActionPanel>
            <Action title="Back to Settings" icon={Icon.ArrowLeft} onAction={() => setShowPreview(false)} />
            <Action
              title="Confirm and Export"
              icon={Icon.Download}
              onAction={() => {
                const tags = tagsText
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter((tag) => tag);
                onExport(flashcards, selectedDeck, selectedModel, tags);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export to Anki" onSubmit={handleSubmit} />
          <Action title="Preview Flashcards" icon={Icon.Eye} onAction={() => setShowPreview(true)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="deck" title="Deck" value={selectedDeck} onChange={setSelectedDeck}>
        {decks.map((deck) => (
          <Form.Dropdown.Item key={deck} value={deck} title={deck} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="model" title="Model" value={selectedModel} onChange={setSelectedModel}>
        {models.map((model) => (
          <Form.Dropdown.Item key={model} value={model} title={model} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="tags"
        title="Tags (comma separated)"
        placeholder="tag1, tag2, tag3"
        value={tagsText}
        onChange={setTagsText}
      />

      {previewFields()}
    </Form>
  );
}

// Main screen for generating flashcards
export default function GenerateFlashcardCommand() {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("english");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [topic, setTopic] = useState("");
  const [selectedFlashcards, setSelectedFlashcards] = useState<Set<number>>(new Set());
  const [aiModel, setAiModel] = useState(AIModelEnum.GPT4o);
  const [difficultyLevel, setDifficultyLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [numCards, setNumCards] = useState<number>(5);
  const [enableTags, setEnableTags] = useState<boolean>(true);

  const aiModels = [
    // Raycast
    { value: AIModelEnum.RAY1, label: "Ray1" },
    { value: AIModelEnum.RAY1_MINI, label: "Ray1 Mini" },

    // OpenAI
    { value: AIModelEnum.GPT3_5, label: "GPT-3.5 Turbo" },
    { value: AIModelEnum.GPT4, label: "GPT-4" },
    { value: AIModelEnum.GPT4_TURBO, label: "GPT-4 Turbo" },
    { value: AIModelEnum.GPT4o, label: "GPT-4o (Recommended)" },
    { value: AIModelEnum.GPT4o_MINI, label: "GPT-4o Mini (Faster)" },
    { value: AIModelEnum.O1, label: "OpenAI O1" },
    { value: AIModelEnum.O1_MINI, label: "OpenAI O1 Mini" },
    { value: AIModelEnum.O3_MINI, label: "OpenAI O3 Mini" },

    // Claude
    { value: AIModelEnum.CLAUDE3_5_HAIKU, label: "Claude 3.5 Haiku" },
    { value: AIModelEnum.CLAUDE3_5_SONNET, label: "Claude 3.5 Sonnet" },
    { value: AIModelEnum.CLAUDE3_7_SONNET, label: "Claude 3.7 Sonnet" },
    { value: AIModelEnum.CLAUDE3_OPUS, label: "Claude 3 Opus (High complexity)" },
    { value: AIModelEnum.CLAUDE3_SONNET, label: "Claude 3 Sonnet (Balanced)" },
    { value: AIModelEnum.CLAUDE3_HAIKU, label: "Claude 3 Haiku (Faster)" },

    // Perplexity
    { value: AIModelEnum.PERPLEXITY_SONAR, label: "Perplexity Sonar" },
    { value: AIModelEnum.PERPLEXITY_SONAR_PRO, label: "Perplexity Sonar Pro" },
    { value: AIModelEnum.PERPLEXITY_SONAR_REASONING, label: "Perplexity Sonar Reasoning" },

    // Llama
    { value: AIModelEnum.LLAMA3_3_70B, label: "Llama 3.3 70B" },
    { value: AIModelEnum.LLAMA3_1_8B, label: "Llama 3.1 8B" },
    { value: AIModelEnum.LLAMA3_70B, label: "Llama 3 70B" },
    { value: AIModelEnum.LLAMA3_1_405B, label: "Llama 3.1 405B" },
    { value: AIModelEnum.LLAMA3_8B, label: "Llama 3 8B" },

    // Mistral
    { value: AIModelEnum.MIXTRAL_8X7B, label: "Mixtral 8x7B" },
    { value: AIModelEnum.MISTRAL_NEMO, label: "Mistral Nemo" },
    { value: AIModelEnum.MISTRAL_LARGE, label: "Mistral Large" },
    { value: AIModelEnum.MISTRAL_SMALL_3, label: "Mistral Small 3" },
    { value: AIModelEnum.MISTRAL_MEDIUM, label: "Mistral Medium" },
    { value: AIModelEnum.MISTRAL_SMALL, label: "Mistral Small" },
    { value: AIModelEnum.CODESTRAL, label: "Codestral" },

    // DeepSeek
    { value: AIModelEnum.DEEPSEEK_R1_DISTILL_LLAMA_70B, label: "DeepSeek R1 Distill Llama 70B" },
    { value: AIModelEnum.DEEPSEEK_R1, label: "DeepSeek R1" },

    // Google
    { value: AIModelEnum.GEMINI_1_5_FLASH, label: "Gemini 1.5 Flash" },
    { value: AIModelEnum.GEMINI_1_5_PRO, label: "Gemini 1.5 Pro" },
    { value: AIModelEnum.GEMINI_2_0_FLASH, label: "Gemini 2.0 Flash" },
    { value: AIModelEnum.GEMINI_2_0_FLASH_THINKING, label: "Gemini 2.0 Flash Thinking" },
    { value: AIModelEnum.GEMINI_PRO, label: "Gemini Pro" },

    // xAI
    { value: AIModelEnum.GROK_2, label: "Grok 2" },
  ];

  const {
    isLoading,
    setIsLoading,
    flashcards,
    decks,
    loadDecks,
    generateFlashcards,
    addFlashcardsToAnki,
    editFlashcard,
    deleteFlashcard,
    testAnkiConnection,
  } = useFlashcardGenerator();

  useEffect(() => {
    loadDecks().catch(() => {
      ErrorHandler.handleAnkiConnectionError();
    });
  }, []);

  useEffect(() => {
    if (flashcards.length > 0 && selectedFlashcards.size === 0) {
      const allIndices = new Set(flashcards.map((_, index) => index));
      setSelectedFlashcards(allIndices);
    }
  }, [flashcards]);

  const handleGenerateFlashcards = async () => {
    if (!text.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Text empty",
        message: "Please enter some text to generate flashcards",
      });
      return;
    }

    try {
      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Generating flashcards...",
        message: "This may take a few seconds",
      });

      // Use the selected model directly from the AIModelEnum
      const selectedModel = aiModel;
      console.log(
        `Generating flashcards with model: ${selectedModel || "default"}, language: ${language}, difficulty: ${difficultyLevel}`,
      );

      // Pass the options to the flashcard generation
      const options = {
        model: selectedModel,
        difficultyLevel: difficultyLevel,
        numCards: numCards,
        enableTags: enableTags,
      };

      const cards = await generateFlashcards(text, language, selectedModel, options);

      if (cards && cards.length > 0) {
        setIsPreviewMode(true);
        showToast({
          style: Toast.Style.Success,
          title: `${cards.length} flashcards generated`,
          message: "You can edit or export to Anki",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to generate flashcards",
          message: "No flashcards were generated. Try again with a different text or more detailed text.",
        });
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error generating flashcards",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFlashcard = (index: number, card: Flashcard) => {
    push(
      <EditFlashcardForm
        flashcard={card}
        onSave={(updatedCard) => {
          editFlashcard(index, updatedCard);
        }}
      />,
    );
  };

  const handleExportToAnki = () => {
    const selectedCards = flashcards.filter((_, idx) => selectedFlashcards.has(idx));

    if (selectedCards.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No flashcard selected",
        message: "Select at least one flashcard to export",
      });
      return;
    }

    testAnkiConnection().then((connected) => {
      if (connected) {
        push(
          <ExportToAnkiForm
            flashcards={selectedCards}
            decks={decks}
            onExport={async (flashcards, deckName, modelName, tags) => {
              await addFlashcardsToAnki(flashcards, deckName, modelName, tags);
            }}
          />,
        );
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Anki connection error",
          message: "Make sure Anki is open and AnkiConnect is installed",
        });
      }
    });
  };

  const toggleSelectFlashcard = (index: number) => {
    const newSelected = new Set(selectedFlashcards);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFlashcards(newSelected);
  };

  if (isPreviewMode && flashcards.length > 0) {
    return (
      <FlashcardPreview
        flashcards={flashcards}
        onEdit={handleEditFlashcard}
        onDelete={deleteFlashcard}
        onSaveToAnki={handleExportToAnki}
        selectedFlashcards={selectedFlashcards}
        onToggleSelect={toggleSelectFlashcard}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Flashcards" onSubmit={handleGenerateFlashcards} />
          <Action title="Test Anki Connection" icon={Icon.Link} onAction={testAnkiConnection} />
          <Action
            title="Advanced Settings"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => {
              push(<PreferencesCommand />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Paste here the text to generate flashcards..."
        value={text}
        onChange={setText}
      />

      <Form.Separator />
      <Form.Description title="Generation Settings" text="Customize how flashcards will be generated" />

      <Form.Dropdown id="model" title="AI Model" value={aiModel} onChange={setAiModel}>
        {aiModels.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="language" title="Language" value={language} onChange={setLanguage}>
        <Form.Dropdown.Item value="english" title="English" />
        <Form.Dropdown.Item value="español" title="Spanish" />
      </Form.Dropdown>

      <Form.Dropdown
        id="difficultyLevel"
        title="Difficulty Level"
        value={difficultyLevel}
        onChange={(newValue) => setDifficultyLevel(newValue as "beginner" | "intermediate" | "advanced")}
      >
        <Form.Dropdown.Item value="beginner" title="Beginner" />
        <Form.Dropdown.Item value="intermediate" title="Intermediate" />
        <Form.Dropdown.Item value="advanced" title="Advanced" />
      </Form.Dropdown>

      <Form.TextField
        id="numCards"
        title="Number of Flashcards"
        placeholder="Number of flashcards to generate"
        value={String(numCards)}
        onChange={(value) => {
          const num = parseInt(value);
          if (!isNaN(num) && num > 0) {
            setNumCards(num);
          }
        }}
      />

      <Form.Checkbox id="enableTags" label="Generate tags automatically" value={enableTags} onChange={setEnableTags} />

      <Form.TextField
        id="topic"
        title="Topic (optional)"
        placeholder="Example: History of Brazil, Programming, etc."
        value={topic}
        onChange={setTopic}
      />

      <Form.Separator />
      <Form.Description
        title="How it works"
        text="Paste some text and the AI will generate flashcards automatically. You can review, edit, and export to Anki."
      />
    </Form>
  );
}
