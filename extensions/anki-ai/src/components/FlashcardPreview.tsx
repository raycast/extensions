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
          title="No flashcards generated"
          description="Generate flashcards to view them here"
        />
      </List>
    );
  }

  const selectedCount = selectedFlashcards.size;
  const totalCount = flashcards.length;

  const handleExportSelectedFlashcards = () => {
    if (onSaveToAnki) {
      const selectedCards = flashcards.filter((_, idx) => selectedFlashcards.has(idx));
      if (selectedCards.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No flashcards selected",
          message: "Select at least one flashcard to export",
        });
        return;
      }
      onSaveToAnki(selectedCards);
    }
  };

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search flashcards..."
      filtering={{ keepSectionOrder: true }}
      navigationTitle="Generated Flashcards"
      actions={
        <ActionPanel>
          <Action
            title={`Export ${selectedCount} Selected Flashcards`}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onAction={handleExportSelectedFlashcards}
          />
          <Action
            title="Select All"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => {
              if (onToggleSelect) {
                // For each unselected index, call onToggleSelect
                flashcards.forEach((_, index) => {
                  if (!selectedFlashcards.has(index)) {
                    onToggleSelect(index);
                  }
                });
              }
            }}
          />
          <Action
            title="Deselect All"
            icon={Icon.XmarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => {
              if (onToggleSelect) {
                // For each selected index, call onToggleSelect to deselect
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
          tooltip="Filter by selection"
          value={filterMode}
          onChange={(value) => {
            setFilterMode(value as "all" | "selected" | "unselected");
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Selected" value="selected" />
          <List.Dropdown.Item title="Unselected" value="unselected" />
        </List.Dropdown>
      }
    >
      <List.Section title={`${totalCount} Flashcards (${selectedCount} selected)`}>
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
              { text: `Card ${item.index + 1}/${flashcards.length}` },
              { text: item.card.extra ? "Has extra information" : "", icon: item.card.extra ? Icon.Star : undefined },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${item.card.front}

## Answer
${item.card.back}

${
  item.card.extra
    ? `## Additional Information
${item.card.extra}`
    : ""
}

${
  item.card.tags && item.card.tags.length > 0
    ? `## Tags
${item.card.tags.map((tag) => `\`${tag}\``).join(" ")}`
    : ""
}

${item.card.image ? `![Image](${item.card.image})` : ""}

---
**Status**: ${selectedFlashcards.has(item.index) ? "✅ Selected for export" : "⬜ Not selected"}`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={selectedFlashcards.has(item.index) ? "Deselect" : "Select for Export"}
                  icon={selectedFlashcards.has(item.index) ? Icon.XmarkCircle : Icon.CheckCircle}
                  onAction={() => onToggleSelect && onToggleSelect(item.index)}
                />
                <Action
                  title={`Export ${selectedCount} Selected Flashcards`}
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onAction={handleExportSelectedFlashcards}
                />
                {onEdit && (
                  <Action title="Edit Flashcard" icon={Icon.Pencil} onAction={() => onEdit(item.index, item.card)} />
                )}
                {onEdit && (
                  <Action
                    title="Enhance with AI"
                    icon={Icon.Wand}
                    onAction={async () => {
                      showToast({ style: Toast.Style.Animated, title: "Enhancing flashcard..." });
                      const enhancedCard = await AIEnhancer.enhanceFlashcard(item.card);
                      onEdit(item.index, enhancedCard);
                      showToast({ style: Toast.Style.Success, title: "Flashcard enhanced!" });
                    }}
                  />
                )}
                {onEdit && (
                  <Action
                    title="Adjust Difficulty"
                    icon={Icon.Gauge}
                    submenu={
                      <ActionPanel>
                        <Action
                          title="Beginner"
                          icon={{ source: Icon.Circle, tintColor: Color.Green }}
                          onAction={() => {
                            const updatedCard = { ...item.card, difficulty: "beginner" as const };
                            onEdit(item.index, updatedCard);
                            showToast({ style: Toast.Style.Success, title: "Difficulty set to Beginner" });
                          }}
                        />
                        <Action
                          title="Intermediate"
                          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                          onAction={() => {
                            const updatedCard = { ...item.card, difficulty: "intermediate" as const };
                            onEdit(item.index, updatedCard);
                            showToast({ style: Toast.Style.Success, title: "Difficulty set to Intermediate" });
                          }}
                        />
                        <Action
                          title="Advanced"
                          icon={{ source: Icon.Circle, tintColor: Color.Red }}
                          onAction={() => {
                            const updatedCard = { ...item.card, difficulty: "advanced" as const };
                            onEdit(item.index, updatedCard);
                            showToast({ style: Toast.Style.Success, title: "Difficulty set to Advanced" });
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                )}
                {onDelete && (
                  <Action
                    title="Delete Flashcard"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => {
                      onDelete(item.index);
                      showToast({ style: Toast.Style.Success, title: "Flashcard deleted" });
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
