import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { Flashcard, Preferences } from "./types";
import { getAllCards, deleteCard, deleteAllCards } from "./utils/storage";
import EditTags from "./edit-tags";
import { t } from "./utils/i18n";

function cardDetailMarkdown(card: Flashcard, language: string): string {
  if (card.type === "standard") {
    return `## ${t(language, "answer")}\n\n${card.back || "—"}`;
  }

  const optionLines = (card.options ?? [])
    .map((o) => {
      const isCorrect = o.id === card.correctOption;
      return `${isCorrect ? "✅" : "⬜"} **${o.id}.** ${o.text}`;
    })
    .join("\n\n");

  return `## ${t(language, "options")}\n\n${optionLines}`;
}

function progressAccessory(card: Flashcard, language: string) {
  if (card.progress === "correct") {
    return {
      tag: { value: "✓", color: Color.Green },
      tooltip: t(language, "answered.correct"),
    };
  }
  if (card.progress === "wrong") {
    return {
      tag: { value: "✗", color: Color.Red },
      tooltip: t(language, "answered.wrong"),
    };
  }
  return {
    tag: { value: "·", color: Color.SecondaryText },
    tooltip: t(language, "not.quizzed"),
  };
}

export default function ListCards() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = getPreferenceValues<Preferences>();
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
      title: t(language, "delete.title"),
      message: `"${card.front}"`,
      primaryAction: {
        title: t(language, "delete.btn"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await deleteCard(card.id);
      await showToast({
        style: Toast.Style.Success,
        title: t(language, "deleted"),
      });
      loadCards();
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirmAlert({
      title: t(language, "delete.all.title"),
      message: t(language, "delete.all.msg"),
      primaryAction: {
        title: t(language, "delete.all.btn"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await deleteAllCards();
      await showToast({
        style: Toast.Style.Success,
        title: t(language, "all.deleted"),
      });
      loadCards();
    }
  }

  const typeIcon = (card: Flashcard) =>
    card.type === "multiple-choice" ? Icon.List : Icon.TextCursor;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={t(language, "search.cards")}
    >
      {cards.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Book}
          title={t(language, "no.cards")}
          description={t(language, "no.cards.desc")}
        />
      ) : (
        cards.map((card) => (
          <List.Item
            key={card.id}
            icon={typeIcon(card)}
            title={card.front}
            accessories={[
              progressAccessory(card, language),
              ...(card.tags.length > 0 ? [{ tag: `#${card.tags[0]}` }] : []),
              ...(card.tags.length > 1
                ? [{ text: `+${card.tags.length - 1}` }]
                : []),
            ]}
            detail={
              <List.Item.Detail
                markdown={cardDetailMarkdown(card, language)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title={t(language, "type")}
                      text={
                        card.type === "standard"
                          ? t(language, "standard")
                          : t(language, "mc")
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title={t(language, "status")}
                      text={
                        card.progress === "correct"
                          ? t(language, "status.correct")
                          : card.progress === "wrong"
                            ? t(language, "status.wrong")
                            : t(language, "status.new")
                      }
                    />
                    {card.tags.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {card.tags.map((tg) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={tg}
                            text={`#${tg}`}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title={t(language, "created")}
                      text={new Date(card.createdAt).toLocaleDateString(
                        language === "en"
                          ? "en-US"
                          : language + "-" + language.toUpperCase(),
                      )}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {/* Tags bearbeiten – öffnet dediziertes Formular */}
                <Action
                  title={t(language, "edit.tags")}
                  icon={Icon.Tag}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={() =>
                    push(<EditTags card={card} onSaved={loadCards} />)
                  }
                />
                <Action
                  title={t(language, "delete.btn")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(card)}
                />
                <Action
                  title={t(language, "delete.all.btn")}
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={handleDeleteAll}
                />
                <Action
                  title={t(language, "refresh")}
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
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
