import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useMemo } from "react";
import { Flashcard } from "../ai/flashcardGenerator";
import { AIEnhancer } from "../utils/aiEnhancer";

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
            title="Exportar Para O Anki"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => {
              if (onSaveToAnki) {
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
              }
            }}
          />
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
        {filteredFlashcards.map((item) => (
          <List.Item
            key={item.index}
            icon={{
              source: selectedFlashcards.has(item.index) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selectedFlashcards.has(item.index) ? Color.Green : Color.PrimaryText,
            }}
            title={item.card.front}
            subtitle={item.card.back.length > 60 ? item.card.back.substring(0, 60) + "..." : item.card.back}
            accessories={[
              { text: `Cartão ${item.index + 1}/${flashcards.length}` },
              { text: item.card.extra ? "Tem informações extras" : "", icon: item.card.extra ? Icon.Star : undefined },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${item.card.front}

## Resposta
${item.card.back}

${
  item.card.extra
    ? `## Informações Complementares
${item.card.extra}`
    : ""
}

${
  item.card.tags && item.card.tags.length > 0
    ? `## Tags
${item.card.tags.map((tag) => `\`${tag}\``).join(" ")}`
    : ""
}

${item.card.image ? `![Imagem](${item.card.image})` : ""}

---
**Status**: ${selectedFlashcards.has(item.index) ? "✅ Selecionado para exportação" : "⬜ Não selecionado"}`}
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
                    title="Ajustar Dificuldade"
                    icon={Icon.Gauge}
                    submenu={
                      <ActionPanel>
                        <Action
                          title="Iniciante"
                          icon={{ source: Icon.Circle, tintColor: Color.Green }}
                          onAction={() => {
                            const updatedCard = { ...item.card, difficulty: "iniciante" as const };
                            onEdit(item.index, updatedCard);
                            showToast({ style: Toast.Style.Success, title: "Dificuldade ajustada para Iniciante" });
                          }}
                        />
                        <Action
                          title="Intermediário"
                          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                          onAction={() => {
                            const updatedCard = { ...item.card, difficulty: "intermediário" as const };
                            onEdit(item.index, updatedCard);
                            showToast({ style: Toast.Style.Success, title: "Dificuldade ajustada para Intermediário" });
                          }}
                        />
                        <Action
                          title="Avançado"
                          icon={{ source: Icon.Circle, tintColor: Color.Red }}
                          onAction={() => {
                            const updatedCard = { ...item.card, difficulty: "avançado" as const };
                            onEdit(item.index, updatedCard);
                            showToast({ style: Toast.Style.Success, title: "Dificuldade ajustada para Avançado" });
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                )}
                {onSaveToAnki && (
                  <Action
                    title="Exportar Este Flashcard"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={() => {
                      const selectedCards = [item.card];
                      onSaveToAnki(selectedCards);
                    }}
                  />
                )}
                {onDelete && (
                  <Action
                    title="Excluir Flashcard"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => {
                      onDelete(item.index);
                      showToast({ style: Toast.Style.Success, title: "Flashcard excluído" });
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
