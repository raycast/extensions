import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { Flashcard, Preferences } from "./types";
import { getAllCards } from "./utils/storage";
import { t } from "./utils/i18n";

// ── Karten-Detail-Ansicht für einen Tag ──────────────────────────────────────

function cardDetailMarkdown(card: Flashcard, language: string): string {
  if (card.type === "standard") {
    return `## ${t(language, "answer")}\n\n${card.back || "—"}`;
  }
  const lines = (card.options ?? []).map((o) => {
    const correct = o.id === card.correctOption;
    return `${correct ? "✅" : "⬜"} **${o.id}.** ${o.text}`;
  });
  return `## ${t(language, "options")}\n\n${lines.join("\n\n")}`;
}

function CardsForTag({
  tag,
  cards,
  language,
}: {
  tag: string;
  cards: Flashcard[];
  language: string;
}) {
  const filtered = cards.filter((c) => c.tags.includes(tag));

  return (
    <List
      isShowingDetail
      navigationTitle={`#${tag}`}
      searchBarPlaceholder={t(language, "search.cards")}
    >
      {filtered.length === 0 ? (
        <List.EmptyView icon={Icon.Tag} title={t(language, "no.cards.tag")} />
      ) : (
        filtered.map((card) => (
          <List.Item
            key={card.id}
            icon={card.type === "multiple-choice" ? Icon.List : Icon.TextCursor}
            title={card.front}
            accessories={[
              card.progress === "correct"
                ? { tag: { value: "✓", color: Color.Green } }
                : card.progress === "wrong"
                  ? { tag: { value: "✗", color: Color.Red } }
                  : { tag: { value: "·", color: Color.SecondaryText } },
            ]}
            detail={
              <List.Item.Detail markdown={cardDetailMarkdown(card, language)} />
            }
          />
        ))
      )}
    </List>
  );
}

// ── Haupt-Tag-Liste ───────────────────────────────────────────────────────────

export default function Tags() {
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

  // Alle Tags mit Kartenanzahl berechnen
  const tagMap = cards.reduce<Record<string, number>>((acc, card) => {
    card.tags.forEach((tg) => {
      acc[tg] = (acc[tg] ?? 0) + 1;
    });
    return acc;
  }, {});

  const tags = Object.entries(tagMap).sort(([a], [b]) => a.localeCompare(b));

  // Karten ohne Tag
  const untagged = cards.filter((c) => c.tags.length === 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t(language, "search.tags")}
    >
      {tags.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tag}
          title={t(language, "no.tags.yet")}
          description={t(language, "no.tags.desc")}
        />
      ) : (
        <>
          <List.Section title={t(language, "tags")}>
            {tags.map(([tag, count]) => (
              <List.Item
                key={tag}
                icon={Icon.Tag}
                title={`#${tag}`}
                accessories={[
                  {
                    text: `${count} ${t(language, "cards")}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={t(language, "show.cards")}
                      icon={Icon.ArrowRight}
                      onAction={() =>
                        push(
                          <CardsForTag
                            tag={tag}
                            cards={cards}
                            language={language}
                          />,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {untagged.length > 0 && (
            <List.Section title={t(language, "untagged")}>
              <List.Item
                icon={Icon.QuestionMark}
                title={t(language, "cards.untagged")}
                accessories={[{ text: `${untagged.length}` }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={t(language, "show")}
                      icon={Icon.ArrowRight}
                      onAction={() =>
                        push(
                          <CardsForTag
                            tag={"__untagged__"}
                            cards={cards.map((c) =>
                              c.tags.length === 0
                                ? { ...c, tags: ["__untagged__"] }
                                : c,
                            )}
                            language={language}
                          />,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
