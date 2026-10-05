import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { Flashcard } from "./types";
import { getAllCards, deleteCard, deleteAllCards } from "./utils/storage";
import { markdownToPlainText } from "./utils/markdown";
import EditCard from "./edit-card";
import EditTags from "./edit-tags";

function cardDetailMarkdown(card: Flashcard): string {
  if (card.type === "standard") {
    return `## Answer\n\n${card.back || "—"}`;
  }

  const optionLines = (card.options ?? [])
    .map((o) => {
      const isCorrect = o.id === card.correctOption;
      return `${isCorrect ? "✅" : "⬜"} **${o.id}.** ${o.text}`;
    })
    .join("\n\n");

  return `## Options\n\n${optionLines}`;
}

function progressAccessory(card: Flashcard) {
  if (card.progress === "correct") {
    return {
      tag: { value: "✓", color: Color.Green },
      tooltip: "Answered Correctly",
    };
  }
  if (card.progress === "wrong") {
    return {
      tag: { value: "✗", color: Color.Red },
      tooltip: "Answered Wrongly",
    };
  }
  return {
    tag: { value: "·", color: Color.SecondaryText },
    tooltip: "Not quizzed yet",
  };
}

export default function ListCards() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setCards(await getAllCards());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  async function handleDelete(card: Flashcard) {
    const confirmed = await confirmAlert({
      title: "Delete Flashcard",
      message: `"${card.front}"`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await deleteCard(card.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Flashcard deleted",
      });
      loadCards();
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirmAlert({
      title: "Delete All Flashcards",
      message: "Are you sure you want to delete all flashcards? This action cannot be undone.",
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await deleteAllCards();
      await showToast({
        style: Toast.Style.Success,
        title: "All flashcards deleted",
      });
      loadCards();
    }
  }

  const typeIcon = (card: Flashcard) => (card.type === "multiple-choice" ? Icon.List : Icon.TextCursor);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search flashcards...">
      {cards.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No Flashcards"
          description="Create your first flashcard to get started!"
        />
      ) : (
        cards.map((card) => (
          <List.Item
            key={card.id}
            icon={typeIcon(card)}
            title={markdownToPlainText(card.front)}
            accessories={[
              progressAccessory(card),
              ...(card.tags.length > 0 ? [{ tag: `#${card.tags[0]}` }] : []),
              ...(card.tags.length > 1 ? [{ text: `+${card.tags.length - 1}` }] : []),
            ]}
            detail={
              <List.Item.Detail
                markdown={cardDetailMarkdown(card)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={card.type === "standard" ? "Standard" : "Multiple Choice"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={card.progress === "correct" ? "Correct" : card.progress === "wrong" ? "Wrong" : "New"}
                    />
                    {card.tags.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {card.tags.map((tg) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tg} text={`#${tg}`} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(card.createdAt).toLocaleDateString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Edit Flashcard"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditCard card={card} onSaved={loadCards} />)}
                />
                {/* Edit tags in the dedicated form. */}
                <Action
                  title="Edit Tags"
                  icon={Icon.Tag}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "t" },
                    Windows: { modifiers: ["ctrl"], key: "t" },
                  }}
                  onAction={() => push(<EditTags card={card} onSaved={loadCards} />)}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(card)}
                />
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete All"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={handleDeleteAll}
                  />
                </ActionPanel.Section>
                <Action
                  title="Refresh List"
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={loadCards}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
