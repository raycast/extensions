import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, Detail } from "@raycast/api";
import { useFlashcardGenerator } from "./hooks/useFlashcardGenerator";
import { FlashcardPreview } from "./components/FlashcardPreview";
import { Flashcard } from "./ai/flashcardGenerator";
import { AnkiRepository } from "./anki/ankiRepository";
import { AIModelEnum } from "./constants/aiModels";
import PreferencesCommand from "./preferences";

import { ErrorHandler } from "./utils/errorHandler";

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
          <Action.SubmitForm title="Save" shortcut={{ modifiers: ["cmd"], key: "enter" }} onSubmit={handleSubmit} />
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
  const [selectedModel, setSelectedModel] = useState("Basic");
  const [tagsText, setTagsText] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const modelList = await AnkiRepository.modelNames();

      if (modelList && modelList.length > 0) {
        setModels(modelList);

        // Definir um modelo padrão baseado na disponibilidade
        if (modelList.includes("Raycast Flashcards")) {
          setSelectedModel("Raycast Flashcards");
        } else if (modelList.includes("Basic")) {
          setSelectedModel("Basic");
        } else if (modelList.length > 0) {
          setSelectedModel(modelList[0]);
        }
      } else {
        // Se não conseguiu obter modelos, mostrar erro
        showToast({
          style: Toast.Style.Failure,
          title: "Erro ao carregar modelos",
          message: "Verifique se o Anki está aberto e tente novamente",
        });

        // Usar modelos padrão como fallback
        const fallbackModels = ["Basic", "Raycast Flashcards", "Cloze"];
        setModels(fallbackModels);
        setSelectedModel("Basic");
      }
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao carregar modelos",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });

      // Usar modelos padrão como fallback
      const fallbackModels = ["Basic", "Raycast Flashcards", "Cloze"];
      setModels(fallbackModels);
      setSelectedModel("Basic");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedDeck) {
      showToast({
        style: Toast.Style.Failure,
        title: "Deck não selecionado",
        message: "Por favor, selecione um deck para exportar",
      });
      return;
    }

    if (!selectedModel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Modelo não selecionado",
        message: "Por favor, selecione um modelo para exportar",
      });
      return;
    }

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Exportando para o Anki...",
      });

      // Converter texto de tags em array
      const tags = tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Verificar conexão com o Anki antes de exportar
      const connectionStatus = await AnkiRepository.getConnectionStatus();

      if (!connectionStatus.ankiRunning) {
        showToast({
          style: Toast.Style.Failure,
          title: "Anki não está em execução",
          message: "Por favor, abra o Anki antes de exportar",
        });
        return;
      }

      if (!connectionStatus.ankiConnectAvailable) {
        showToast({
          style: Toast.Style.Failure,
          title: "AnkiConnect não está disponível",
          message: connectionStatus.message || "Verifique a instalação do AnkiConnect",
        });
        return;
      }

      // Prosseguir com a exportação
      onExport(flashcards, selectedDeck, selectedModel, tags);

      // Fechar o modal após exportação bem-sucedida
      pop();
    } catch (error) {
      console.error("Erro durante exportação:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao exportar para o Anki",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading Anki models..." />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Export ${flashcards.length} Flashcards to Anki`}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={handleExport}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Export Settings"
        text={`You are about to export ${flashcards.length} flashcards to Anki. Please select a deck and model.`}
      />

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

      <Form.Separator />

      <Form.Description
        title="Note"
        text="The flashcards will be added to the selected deck using the selected model. Any tags you specify here will be added to all flashcards in addition to their individual tags."
      />
    </Form>
  );
}

export default function GenerateFlashcardCommand() {
  const navigation = useNavigation();
  const { push } = navigation;
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("english");
  const [numCards, setNumCards] = useState<number>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [topic, setTopic] = useState("");
  const [enableTags, setEnableTags] = useState<boolean>(true);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [selectedFlashcards, setSelectedFlashcards] = useState<Set<number>>(new Set());
  const [aiModel, setAiModel] = useState<string>(AIModelEnum.GPT4o);

  const aiModels = [
    { value: AIModelEnum.RAY1, label: "Ray1" },
    { value: AIModelEnum.RAY1_MINI, label: "Ray1 Mini" },
    { value: AIModelEnum.GPT3_5, label: "GPT-3.5 Turbo" },
    { value: AIModelEnum.GPT4, label: "GPT-4" },
    { value: AIModelEnum.GPT4_TURBO, label: "GPT-4 Turbo" },
    { value: AIModelEnum.GPT4o, label: "GPT-4o (Recommended)" },
    { value: AIModelEnum.GPT4o_MINI, label: "GPT-4o Mini (Faster)" },
    { value: AIModelEnum.O1, label: "OpenAI O1" },
    { value: AIModelEnum.O1_MINI, label: "OpenAI O1 Mini" },
    { value: AIModelEnum.O3_MINI, label: "OpenAI O3 Mini" },
    { value: AIModelEnum.CLAUDE3_5_HAIKU, label: "Claude 3.5 Haiku" },
    { value: AIModelEnum.CLAUDE3_5_SONNET, label: "Claude 3.5 Sonnet" },
    { value: AIModelEnum.CLAUDE3_7_SONNET, label: "Claude 3.7 Sonnet" },
    { value: AIModelEnum.CLAUDE3_OPUS, label: "Claude 3 Opus (High complexity)" },
    { value: AIModelEnum.CLAUDE3_SONNET, label: "Claude 3 Sonnet (Balanced)" },
    { value: AIModelEnum.CLAUDE3_HAIKU, label: "Claude 3 Haiku (Faster)" },
    { value: AIModelEnum.PERPLEXITY_SONAR, label: "Perplexity Sonar" },
    { value: AIModelEnum.PERPLEXITY_SONAR_PRO, label: "Perplexity Sonar Pro" },
    { value: AIModelEnum.PERPLEXITY_SONAR_REASONING, label: "Perplexity Sonar Reasoning" },
    { value: AIModelEnum.LLAMA3_3_70B, label: "Llama 3.3 70B" },
    { value: AIModelEnum.LLAMA3_1_8B, label: "Llama 3.1 8B" },
    { value: AIModelEnum.LLAMA3_70B, label: "Llama 3 70B" },
    { value: AIModelEnum.LLAMA3_1_405B, label: "Llama 3.1 405B" },
    { value: AIModelEnum.LLAMA3_8B, label: "Llama 3 8B" },
    { value: AIModelEnum.MIXTRAL_8X7B, label: "Mixtral 8x7B" },
    { value: AIModelEnum.MISTRAL_NEMO, label: "Mistral Nemo" },
    { value: AIModelEnum.MISTRAL_LARGE, label: "Mistral Large" },
    { value: AIModelEnum.MISTRAL_SMALL_3, label: "Mistral Small 3" },
    { value: AIModelEnum.MISTRAL_MEDIUM, label: "Mistral Medium" },
    { value: AIModelEnum.MISTRAL_SMALL, label: "Mistral Small" },
    { value: AIModelEnum.CODESTRAL, label: "Codestral" },
    { value: AIModelEnum.DEEPSEEK_R1_DISTILL_LLAMA_70B, label: "DeepSeek R1 Distill Llama 70B" },
    { value: AIModelEnum.DEEPSEEK_R1, label: "DeepSeek R1" },
    { value: AIModelEnum.GEMINI_1_5_FLASH, label: "Gemini 1.5 Flash" },
    { value: AIModelEnum.GEMINI_1_5_PRO, label: "Gemini 1.5 Pro" },
    { value: AIModelEnum.GEMINI_2_0_FLASH, label: "Gemini 2.0 Flash" },
    { value: AIModelEnum.GEMINI_2_0_FLASH_THINKING, label: "Gemini 2.0 Flash Thinking" },
    { value: AIModelEnum.GEMINI_PRO, label: "Gemini Pro" },
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

      const selectedModel = aiModel;
      console.log(
        `Generating flashcards with model: ${selectedModel || "default"}, language: ${language}, difficulty: ${difficultyLevel}`,
      );
      showToast({
        style: Toast.Style.Animated,
        title: "Processing content...",
        message: `Using ${selectedModel} to generate flashcards`,
      });

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
        title: "No flashcards selected",
        message: "Select at least one flashcard to export",
      });
      return;
    }

    setIsLoading(true);
    showToast({
      style: Toast.Style.Animated,
      title: "Testing connection to Anki",
      message: "Please wait...",
    });

    testAnkiConnection().then((connected) => {
      setIsLoading(false);

      if (connected) {
        showToast({
          style: Toast.Style.Animated,
          title: "Preparing to export",
          message: `${selectedCards.length} flashcards will be exported to Anki`,
        });

        push(
          <ExportToAnkiForm
            flashcards={selectedCards}
            decks={decks}
            onExport={async (flashcards, deckName, modelName, tags) => {
              setIsLoading(true);
              showToast({
                style: Toast.Style.Animated,
                title: "Exporting flashcards",
                message: `Exporting ${flashcards.length} flashcards to "${deckName}"`,
              });

              const result = await addFlashcardsToAnki(flashcards, deckName, modelName, tags);

              setIsLoading(false);
              if (result) {
                showToast({
                  style: Toast.Style.Success,
                  title: "Export successful",
                  message: `${flashcards.length} flashcards exported to "${deckName}"`,
                });
              }
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
          <Action.SubmitForm
            title="Generate Flashcards"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={handleGenerateFlashcards}
          />
          <Action
            title="Test Anki Connection"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={testAnkiConnection}
          />
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
        <Form.Dropdown.Item value="português" title="Portuguese" />
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
