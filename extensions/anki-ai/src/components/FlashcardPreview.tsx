import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useMemo } from "react";
import { Flashcard } from "../ai/flashcardGenerator";
import { AIEnhancer } from "../ai/aiEnhancer";

interface FlashcardPreviewProps {
  flashcards: Flashcard[];
  onEdit?: (index: number, updatedCard: Flashcard) => void;
  onDelete?: (index: number) => void;
  onSaveToAnki?: (flashcards: Flashcard[]) => void;
  selectedFlashcards?: Set<number>;
  onToggleSelect?: (index: number) => void;
}

export function FlashcardPreview({
  flashcards,
  onEdit,
  onDelete,
  onSaveToAnki,
  selectedFlashcards = new Set<number>(),
  onToggleSelect,
}: FlashcardPreviewProps) {
  const [filterMode, setFilterMode] = useState<"all" | "selected" | "unselected">("all");

  const filteredFlashcards = useMemo(() => {
    if (filterMode === "all") return flashcards.map((card, index) => ({ card, index }));
    if (filterMode === "selected")
      return flashcards.map((card, index) => ({ card, index })).filter((item) => selectedFlashcards.has(item.index));
    if (filterMode === "unselected")
      return flashcards.map((card, index) => ({ card, index })).filter((item) => !selectedFlashcards.has(item.index));
    return flashcards.map((card, index) => ({ card, index }));
  }, [flashcards, selectedFlashcards, filterMode]);

  if (!flashcards || flashcards.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Document}
          title="Nenhum flashcard gerado"
          description="Gere flashcards para visualizá-los aqui"
        />
      </List>
    );
  }

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Buscar flashcards..."
      filtering={{ keepSectionOrder: true }}
      navigationTitle="Flashcards Gerados"
      actions={
        <ActionPanel>
          <Action
            title="Selecionar Todos"
            icon={Icon.CheckCircle}
            onAction={() => {
              if (onToggleSelect) {
                // Para cada índice que não está selecionado, chama onToggleSelect
                flashcards.forEach((_, index) => {
                  if (!selectedFlashcards.has(index)) {
                    onToggleSelect(index);
                  }
                });
              }
            }}
          />
          <Action
            title="Desmarcar Todos"
            icon={Icon.XmarkCircle}
            onAction={() => {
              if (onToggleSelect) {
                // Para cada índice selecionado, chama onToggleSelect para desmarcar
                [...selectedFlashcards].forEach((index) => {
                  onToggleSelect(index);
                });
              }
            }}
          />
          {onSaveToAnki && (
            <Action
              title="Exportar Selecionados Para O Anki"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => {
                const selectedCards = flashcards.filter((_, idx) => selectedFlashcards.has(idx));
                if (selectedCards.length === 0) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Nenhum flashcard selecionado",
                    message: "Selecione pelo menos um flashcard para exportar",
                  });
                  return;
                }
                onSaveToAnki(selectedCards);
              }}
            />
          )}
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filtrar por seleção"
          value={filterMode}
          onChange={(value) => {
            setFilterMode(value as "all" | "selected" | "unselected");
          }}
        >
          <List.Dropdown.Item title="Todos" value="all" />
          <List.Dropdown.Item title="Selecionados" value="selected" />
          <List.Dropdown.Item title="Não Selecionados" value="unselected" />
        </List.Dropdown>
      }
    >
      <List.Section title={`${flashcards.length} Flashcards (${selectedFlashcards.size} selecionados)`}>
        {filteredFlashcards.map((item, index) => (
          <List.Item
            key={item.index}
            icon={{
              source: selectedFlashcards.has(item.index) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selectedFlashcards.has(item.index) ? Color.Green : Color.PrimaryText,
            }}
            title={item.card.front}
            subtitle={item.card.back}
            accessories={[
              {
                icon: selectedFlashcards.has(item.index) ? Icon.Checkmark : undefined,
                tooltip: selectedFlashcards.has(item.index) ? "Selecionado para exportação" : "Clique para selecionar",
              },
              { text: `Cartão ${item.index + 1}/${flashcards.length}` },
              { text: item.card.extra ? "Tem informações extras" : "", icon: item.card.extra ? Icon.Star : undefined },
            ]}
            detail={
              <List.Item.Detail
                markdown={`## Frente\n${item.card.front}\n\n## Verso\n${item.card.back}\n\n${item.card.extra ? `## Informações Extras\n${item.card.extra}` : ""}${item.card.image ? `\n\n![Imagem](${item.card.image})` : ""}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      icon={{
                        source: selectedFlashcards.has(item.index) ? Icon.CheckCircle : Icon.Circle,
                        tintColor: selectedFlashcards.has(item.index) ? Color.Green : Color.PrimaryText,
                      }}
                      text={selectedFlashcards.has(item.index) ? "Selecionado para exportação" : "Não selecionado"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Frente" text={item.card.front} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Verso" text={item.card.back} />
                    {item.card.extra && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Informações Extras" text={item.card.extra} />
                      </>
                    )}
                    {item.card.tags && item.card.tags.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="Tags">
                          {item.card.tags.map((tag, i) => (
                            <List.Item.Detail.Metadata.TagList.Item key={i} text={tag} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={selectedFlashcards.has(item.index) ? "Desmarcar Para Exportação" : "Marcar Para Exportação"}
                  icon={selectedFlashcards.has(item.index) ? Icon.XmarkCircle : Icon.CheckCircle}
                  onAction={() => onToggleSelect && onToggleSelect(item.index)}
                />
                {onEdit && (
                  <Action title="Editar Flashcard" icon={Icon.Pencil} onAction={() => onEdit(item.index, item.card)} />
                )}
                {onEdit && (
                  <Action
                    title="Melhorar Com Ia"
                    icon={Icon.Wand}
                    onAction={async () => {
                      showToast({ style: Toast.Style.Animated, title: "Melhorando flashcard..." });
                      const enhancedCard = await AIEnhancer.enhanceFlashcard(item.card);
                      onEdit(item.index, enhancedCard);
                      showToast({ style: Toast.Style.Success, title: "Flashcard melhorado!" });
                    }}
                  />
                )}
                {onEdit && (
                  <Action
                    title="Avaliar Qualidade"
                    icon={Icon.Stars}
                    onAction={async () => {
                      showToast({ style: Toast.Style.Animated, title: "Avaliando flashcard..." });
                      const evaluation = await AIEnhancer.evaluateFlashcard(item.card);
                      showToast({
                        style: Toast.Style.Success,
                        title: `Pontuação: ${evaluation.score}/10`,
                        message: evaluation.suggestions.join(" | "),
                      });
                    }}
                  />
                )}
                {onDelete && (
                  <Action
                    title="Excluir Flashcard"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => onDelete(item.index)}
                  />
                )}
                {onSaveToAnki && index === 0 && (
                  <Action
                    title="Exportar Selecionados Para O Anki"
                    icon={Icon.Download}
                    onAction={() => {
                      const selectedCards = flashcards.filter((_, idx) => selectedFlashcards.has(idx));
                      if (selectedCards.length === 0) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Nenhum flashcard selecionado",
                          message: "Selecione pelo menos um flashcard para exportar",
                        });
                        return;
                      }
                      onSaveToAnki(selectedCards);
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
