import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, Detail } from "@raycast/api";
import { useFlashcardGenerator } from "./hooks/useFlashcardGenerator";
import { FlashcardPreview } from "./components/FlashcardPreview";
import { Flashcard } from "./ai/flashcardGenerator";
import { AIEnhancer } from "./ai/aiEnhancer";
import { ErrorHandler } from "./utils/errorHandler";
import { AnkiRepository } from "./anki/ankiRepository";

// Formulário para editar um flashcard
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
          <Action.SubmitForm title="Salvar" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="front"
        title="Frente"
        placeholder="Pergunta ou conceito"
        value={frontText}
        onChange={setFrontText}
      />
      <Form.TextArea
        id="back"
        title="Verso"
        placeholder="Resposta ou explicação"
        value={backText}
        onChange={setBackText}
      />
      <Form.TextArea
        id="extra"
        title="Informações Extras"
        placeholder="Informações adicionais, exemplos ou contexto"
        value={extraText}
        onChange={setExtraText}
      />
      <Form.TextField
        id="image"
        title="URL da Imagem (opcional)"
        placeholder="https://exemplo.com/imagem.jpg"
        value={imageUrl}
        onChange={setImageUrl}
      />
      <Form.TextField
        id="tags"
        title="Tags (opcional)"
        placeholder="Separe as tags por vírgulas"
        value={tagsText}
        onChange={setTagsText}
      />
    </Form>
  );
}

// Formulário para configurar a exportação para o Anki
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
        // Adicionar "Raycast Flashcards" à lista se não existir
        if (!response.result.includes("Raycast Flashcards")) {
          setModels((prev) => [...prev, "Raycast Flashcards"]);
        }
        // Usar "Raycast Flashcards" como padrão
        setSelectedModel("Raycast Flashcards");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao carregar modelos",
        message: "Verifique se o Anki está aberto",
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
        title: "Erro ao carregar campos do modelo",
        message: "Verifique se o Anki está aberto",
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

    // Pegar o primeiro flashcard como exemplo
    const example = flashcards[0];
    return (
      <Form.Description
        text={`
Campos do modelo "${selectedModel}":
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
        navigationTitle="Prévia dos Flashcards para Exportação"
        markdown={`
# Prévia dos Flashcards para Exportação

## Configurações
- **Deck**: ${selectedDeck}
- **Modelo**: ${selectedModel}
- **Tags**: ${tagsText || "Nenhuma"}

## Flashcards (${flashcards.length})
${flashcards
  .map(
    (card, index) => `
### Flashcard ${index + 1}

**Frente**: ${card.front}

**Verso**: ${card.back}

${card.extra ? `**Extra**: ${card.extra}` : ""}
${card.tags && card.tags.length > 0 ? `**Tags**: ${card.tags.join(", ")}` : ""}
---`,
  )
  .join("\n")}
        `}
        actions={
          <ActionPanel>
            <Action title="Voltar Para Configurações" icon={Icon.ArrowLeft} onAction={() => setShowPreview(false)} />
            <Action
              title="Confirmar E Exportar"
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
          <Action.SubmitForm title="Exportar Para Anki" onSubmit={handleSubmit} />
          <Action title="Visualizar Flashcards" icon={Icon.Eye} onAction={() => setShowPreview(true)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="deck" title="Deck" value={selectedDeck} onChange={setSelectedDeck}>
        {decks.map((deck) => (
          <Form.Dropdown.Item key={deck} value={deck} title={deck} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="model" title="Modelo" value={selectedModel} onChange={setSelectedModel}>
        {models.map((model) => (
          <Form.Dropdown.Item key={model} value={model} title={model} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="tags"
        title="Tags (separadas por vírgula)"
        placeholder="tag1, tag2, tag3"
        value={tagsText}
        onChange={setTagsText}
      />

      {previewFields()}
    </Form>
  );
}

// Tela principal para gerar flashcards
export default function GenerateFlashcardCommand() {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("português");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [topic, setTopic] = useState("");
  const [selectedFlashcards, setSelectedFlashcards] = useState<Set<number>>(new Set());
  const [aiModel, setAiModel] = useState("OpenAI_GPT4o");

  const aiModels = [
    { value: "OpenAI_GPT4o", label: "GPT-4o (Recomendado)" },
    { value: "OpenAI_GPT4o-mini", label: "GPT-4o Mini (Mais rápido)" },
    { value: "OpenAI_o1", label: "OpenAI O1 (Especialista em código)" },
    { value: "Anthropic_Claude_Opus", label: "Claude Opus (Alta complexidade)" },
    { value: "Anthropic_Claude_Sonnet", label: "Claude Sonnet (Balanceado)" },
    { value: "Anthropic_Claude_Haiku", label: "Claude Haiku (Mais rápido)" },
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
        title: "Texto vazio",
        message: "Por favor, insira algum texto para gerar flashcards",
      });
      return;
    }

    try {
      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Gerando flashcards...",
        message: "Isso pode levar alguns segundos",
      });

      // Extract model name from the selected option
      const selectedModel = aiModel !== "default" ? aiModel : undefined;
      console.log(`Gerando flashcards com modelo: ${selectedModel || "padrão"}, idioma: ${language}`);

      const cards = await generateFlashcards(text, language, selectedModel);

      if (cards && cards.length > 0) {
        setIsPreviewMode(true);
        showToast({
          style: Toast.Style.Success,
          title: `${cards.length} flashcards gerados`,
          message: "Você pode editar ou exportar para o Anki",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Falha ao gerar flashcards",
          message: "Nenhum flashcard foi gerado. Tente novamente com um texto diferente ou mais detalhado.",
        });
      }
    } catch (error) {
      console.error("Erro ao gerar flashcards:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao gerar flashcards",
        message: error instanceof Error ? error.message : "Erro desconhecido",
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
        title: "Nenhum flashcard selecionado",
        message: "Selecione pelo menos um flashcard para exportar",
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
          title: "Erro de conexão com o Anki",
          message: "Verifique se o Anki está aberto e o AnkiConnect está instalado",
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
          <Action.SubmitForm title="Gerar Flashcards" onSubmit={handleGenerateFlashcards} />
          <Action title="Testar Conexão Com Anki" icon={Icon.Link} onAction={testAnkiConnection} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Texto"
        placeholder="Cole aqui o texto para gerar flashcards..."
        value={text}
        onChange={setText}
      />
      <Form.Dropdown id="model" title="Modelo de IA" value={aiModel} onChange={setAiModel}>
        {aiModels.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.label} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="topic"
        title="Tópico (opcional)"
        placeholder="Ex: História do Brasil, Programação, etc."
        value={topic}
        onChange={setTopic}
      />
      <Form.Dropdown id="language" title="Idioma" value={language} onChange={setLanguage}>
        <Form.Dropdown.Item value="português" title="Português" />
        <Form.Dropdown.Item value="english" title="English" />
        <Form.Dropdown.Item value="español" title="Español" />
      </Form.Dropdown>
      <Form.Description
        title="Como funciona"
        text="Cole um texto e a IA irá gerar flashcards automaticamente. Você poderá revisar, editar e exportar para o Anki."
      />
      <Form.Separator />
      {topic && (
        <ActionPanel>
          <Action
            title="Gerar Perguntas Relacionadas"
            icon={Icon.QuestionMark}
            onAction={async () => {
              showToast({ style: Toast.Style.Animated, title: "Gerando perguntas relacionadas..." });
              const relatedQuestions = await AIEnhancer.generateRelatedQuestions(topic, 5, {
                model: aiModel !== "default" ? aiModel : undefined,
              });

              if (relatedQuestions.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Não foi possível gerar perguntas relacionadas",
                });
                return;
              }

              const newFlashcards: Flashcard[] = relatedQuestions.map((q) => ({
                front: q.question,
                back: q.answer,
                extra: "",
              }));

              for (const card of newFlashcards) {
                editFlashcard(flashcards.length, card);
              }
              showToast({
                style: Toast.Style.Success,
                title: `${newFlashcards.length} perguntas relacionadas geradas`,
              });

              if (newFlashcards.length > 0) {
                setIsPreviewMode(true);
              }
            }}
          />
        </ActionPanel>
      )}
    </Form>
  );
}
