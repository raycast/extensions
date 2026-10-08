import { List, ActionPanel, Action, Icon, Color, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { Flashcard } from "./types";
import { getAllCards } from "./utils/storage";
import { markdownToPlainText } from "./utils/markdown";
import EditCard from "./edit-card";

// ── Card detail view for a tag ───────────────────────────────────────────────

// Build the Markdown detail view for a card.
function cardDetailMarkdown(card: Flashcard): string {
  if (card.type === "standard") {
    return `## Answer\n\n${card.back || "—"}`;
  }
  const lines = (card.options ?? []).map((o) => {
    const correct = o.id === card.correctOption;
    return `${correct ? "✅" : "⬜"} **${o.id}.** ${o.text}`;
  });
  return `## Options\n\n${lines.join("\n\n")}`;
}

// Show all cards for a specific tag.
function CardsForTag({ tag, cards }: { tag: string; cards: Flashcard[] }) {
  const filtered = cards.filter((c) => c.tags.includes(tag));
  const { push } = useNavigation();

  return (
    <List isShowingDetail navigationTitle={`#${tag}`} searchBarPlaceholder="Search cards...">
      {filtered.length === 0 ? (
        <List.EmptyView icon={Icon.Tag} title="No cards found for this tag" />
      ) : (
        filtered.map((card) => (
          <List.Item
            key={card.id}
            icon={card.type === "multiple-choice" ? Icon.List : Icon.TextCursor}
            title={markdownToPlainText(card.front)}
            accessories={[
              card.progress === "correct"
                ? { tag: { value: "✓", color: Color.Green } }
                : card.progress === "wrong"
                  ? { tag: { value: "✗", color: Color.Red } }
                  : { tag: { value: "·", color: Color.SecondaryText } },
            ]}
            detail={<List.Item.Detail markdown={cardDetailMarkdown(card)} />}
            actions={
              <ActionPanel>
                <Action title="Edit Flashcard" icon={Icon.Pencil} onAction={() => push(<EditCard card={card} />)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// ── Main tag list ────────────────────────────────────────────────────────────

// Main component for displaying all tags.
export default function Tags() {
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

  // Calculate every tag and its card count.
  const tagMap = cards.reduce<Record<string, number>>((acc, card) => {
    card.tags.forEach((tg) => {
      acc[tg] = (acc[tg] ?? 0) + 1;
    });
    return acc;
  }, {});

  const tags = Object.entries(tagMap).sort(([a], [b]) => a.localeCompare(b));

  // Cards without tags.
  const untagged = cards.filter((c) => c.tags.length === 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {tags.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tag}
          title="No tags created yet"
          description="Create some flashcards with tags first."
        />
      ) : (
        <>
          <List.Section title="Tags">
            {tags.map(([tag, count]) => (
              <List.Item
                key={tag}
                icon={Icon.Tag}
                title={`#${tag}`}
                accessories={[
                  {
                    text: `${count} ${count === 1 ? "card" : "cards"}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Cards"
                      icon={Icon.ArrowRight}
                      onAction={() => push(<CardsForTag tag={tag} cards={cards} />)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {untagged.length > 0 && (
            <List.Section title="Untagged">
              <List.Item
                icon={Icon.QuestionMark}
                title="Cards without tags"
                accessories={[{ text: `${untagged.length}` }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show"
                      icon={Icon.ArrowRight}
                      onAction={() =>
                        push(
                          <CardsForTag
                            tag={"__untagged__"}
                            cards={cards.map((c) => (c.tags.length === 0 ? { ...c, tags: ["__untagged__"] } : c))}
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
