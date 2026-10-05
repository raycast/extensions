import { Detail, List, ActionPanel, Action, Icon, Color, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { Flashcard } from "./types";
import { getAllCards, getAllTags, updateProgress } from "./utils/storage";

// ── Helper functions ─────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Standard card quiz ────────────────────────────────────────────────────────

function StandardCardQuiz({
  card,
  index,
  total,
  onAnswer,
}: {
  card: Flashcard;
  index: number;
  total: number;
  onAnswer: (correct: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  // Reset the answer when the card changes.
  const prevCardId = useRef(card.id);
  useEffect(() => {
    if (prevCardId.current !== card.id) {
      setRevealed(false);
      prevCardId.current = card.id;
    }
  }, [card.id]);

  const frontMd = `# ${card.front}\n\n---\n\n*Press Enter or click the action to reveal the answer.*`;

  const backMd = `# ${card.front}\n\n---\n\n## Answer\n\n**${card.back}**\n\n---\n\n*Rate how well you knew the answer:*\n\n➡️ *Right Arrow: I knew it*  \n⬅️ *Left Arrow: I didn't know it*`;

  return (
    <Detail
      navigationTitle={`Card ${index + 1} / ${total}`}
      markdown={revealed ? backMd : frontMd}
      actions={
        <ActionPanel>
          {!revealed ? (
            <Action title="Reveal Answer" icon={Icon.Eye} onAction={() => setRevealed(true)} />
          ) : (
            <>
              <Action
                title="I Knew It (Correct)"
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                shortcut={{ modifiers: [], key: "arrowRight" }}
                onAction={() => onAnswer(true)}
              />
              <Action
                title="I Didn't Know It (Wrong)"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={() => onAnswer(false)}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

// ── Multiple-choice card quiz ────────────────────────────────────────────────

function MCCardQuiz({
  card,
  index,
  total,
  onAnswer,
}: {
  card: Flashcard;
  index: number;
  total: number;
  onAnswer: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const isAnswered = selected !== null;
  const isCorrect = selected === card.correctOption;

  function getOptionIcon(optionId: number) {
    if (!isAnswered) return Icon.Circle;
    if (optionId === card.correctOption) return Icon.CheckCircle;
    if (optionId === selected) return Icon.XMarkCircle;
    return Icon.Circle;
  }

  function getOptionColor(optionId: number): Color | undefined {
    if (!isAnswered) return undefined;
    if (optionId === card.correctOption) return Color.Green;
    if (optionId === selected) return Color.Red;
    return Color.SecondaryText;
  }

  const questionMd = isAnswered
    ? `# ${card.front}\n\n---\n\n${isCorrect ? "✅ Correct!" : "❌ Wrong!"}`
    : `# ${card.front}`;

  return (
    <List navigationTitle={`Card ${index + 1} / ${total}`} isShowingDetail>
      <List.Section title="Question">
        <List.Item title={card.front} detail={<List.Item.Detail markdown={questionMd} />} />
      </List.Section>

      <List.Section title="Options">
        {(card.options ?? []).map((opt) => (
          <List.Item
            key={opt.id}
            icon={{
              source: getOptionIcon(opt.id),
              tintColor: getOptionColor(opt.id),
            }}
            title={`${opt.id}. ${opt.text}`}
            accessories={
              isAnswered && opt.id === card.correctOption
                ? [
                    {
                      tag: {
                        value: "Correct",
                        color: Color.Green,
                      },
                    },
                  ]
                : isAnswered && opt.id === selected
                  ? [
                      {
                        tag: {
                          value: "Wrong",
                          color: Color.Red,
                        },
                      },
                    ]
                  : []
            }
            actions={
              <ActionPanel>
                {!isAnswered ? (
                  <Action title={`Choose Option ${opt.id}`} onAction={() => setSelected(opt.id)} />
                ) : (
                  <Action title="Next Card" icon={Icon.ArrowRight} onAction={() => onAnswer(isCorrect)} />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// ── Quiz session ──────────────────────────────────────────────────────────────

// Component that runs a quiz session.
function QuizSession({ cards }: { cards: Flashcard[] }) {
  const [queue] = useState(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({ correct: 0, wrong: 0 });
  const [done, setDone] = useState(false);
  const { pop } = useNavigation();

  const card = queue[index];

  async function handleAnswer(correct: boolean) {
    await updateProgress(card.id, correct ? "correct" : "wrong");
    setResults((r) => ({
      ...r,
      correct: r.correct + (correct ? 1 : 0),
      wrong: r.wrong + (correct ? 0 : 1),
    }));

    await showToast({
      style: correct ? Toast.Style.Success : Toast.Style.Failure,
      title: correct ? "I Knew It (Correct)" : "I Didn't Know It (Wrong)",
    });

    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (done) {
    const total = queue.length;
    const pct = Math.round((results.correct / total) * 100);
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪";
    const summaryMd = `# ${emoji} Quiz Completed!

---

| | |
|---|---|
| Correct | **${results.correct} / ${total}** |
| Wrong | **${results.wrong} / ${total}** |
| Score | **${pct}%** |

---

*Your study progress has been saved automatically.*`;

    return (
      <Detail
        navigationTitle="Quiz Completed!"
        markdown={summaryMd}
        actions={
          <ActionPanel>
            <Action title="Back to Main Menu" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  if (!card) return null;

  return card.type === "standard" ? (
    <StandardCardQuiz key={card.id} card={card} index={index} total={queue.length} onAnswer={handleAnswer} />
  ) : (
    <MCCardQuiz key={card.id} card={card} index={index} total={queue.length} onAnswer={handleAnswer} />
  );
}

// ── Tag selection for quiz ───────────────────────────────────────────────────

// Component for selecting tags for the quiz.
function TagSelector({ allCards, tags }: { allCards: Flashcard[]; tags: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { push } = useNavigation();

  function toggleTag(tag: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function startQuiz() {
    const filtered = selected.size === 0 ? allCards : allCards.filter((c) => c.tags.some((tg) => selected.has(tg)));

    if (filtered.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No cards found for the selected tags.",
      });
      return;
    }
    push(<QuizSession cards={filtered} />);
  }

  // Add shortcuts for the first nine tags (⌘1 through ⌘9).
  const shortcutKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

  return (
    <List navigationTitle="Select Quiz Tags" searchBarPlaceholder="Filter tags by name...">
      <List.Section title="Select Multiple Tags" subtitle={selected.size === 0 ? "All" : `${selected.size} selected`}>
        {tags.map((tag, i) => {
          const isSelected = selected.has(tag);
          const count = allCards.filter((c) => c.tags.includes(tag)).length;
          const hasShortcut = i < shortcutKeys.length;

          return (
            <List.Item
              key={tag}
              icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Blue } : Icon.Circle}
              title={`#${tag}`}
              accessories={[{ text: `${count}` }, ...(hasShortcut ? [{ tag: `⌘${shortcutKeys[i]}` }] : [])]}
              actions={
                <ActionPanel>
                  {/* Primary action: start the quiz (Enter). */}
                  <Action
                    title={`Start Quiz (${selected.size === 0 ? "all" : selected.size + " tags"})`}
                    icon={Icon.Play}
                    onAction={startQuiz}
                  />
                  {/* Toggle the tag for the focused item without a shortcut. */}
                  <Action
                    title={isSelected ? "Deselect Tag" : "Select Tag"}
                    icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => toggleTag(tag)}
                  />
                  {/* Keep all tag shortcuts (⌘1-⌘9) available from every item. */}
                  {tags.slice(0, shortcutKeys.length).map((tg, j) => (
                    <Action
                      key={tg}
                      title={`${selected.has(tg) ? "✓ " : ""}#${tg}`}
                      icon={selected.has(tg) ? { source: Icon.CheckCircle, tintColor: Color.Blue } : Icon.Circle}
                      shortcut={{ modifiers: ["cmd"], key: shortcutKeys[j] }}
                      onAction={() => toggleTag(tg)}
                    />
                  ))}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// ── Mode selection ────────────────────────────────────────────────────────────

// Component for selecting the quiz mode.
function ModeSelector({ allCards, tags }: { allCards: Flashcard[]; tags: string[] }) {
  const { push } = useNavigation();

  const wrongCards = allCards.filter((c) => c.progress === "wrong");
  const newCards = allCards.filter((c) => c.progress === "unanswered");

  function startWrongCards() {
    if (wrongCards.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Wrong Cards",
        message: "You don't have any wrongly answered cards yet. Good job!",
      });
      return;
    }
    push(<QuizSession cards={wrongCards} />);
  }

  function startNewCards() {
    if (newCards.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No new cards available. Try studying wrong cards or all cards.",
      });
      return;
    }
    push(<QuizSession cards={newCards} />);
  }

  function startByTag() {
    push(<TagSelector allCards={allCards} tags={tags} />);
  }

  function startAll() {
    if (allCards.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No cards available. Please create some flashcards first.",
      });
      return;
    }
    push(<QuizSession cards={allCards} />);
  }

  // Define modes with shortcuts for quick access.
  const modes = [
    {
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      title: "Wrongly Answered Cards",
      subtitle: `${wrongCards.length} cards`,
      onAction: startWrongCards,
      actionTitle: "Start Quiz",
      actionIcon: Icon.Play,
      shortcut: { modifiers: ["cmd" as const], key: "1" as const },
    },
    {
      icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
      title: "New Cards",
      subtitle: `${newCards.length} cards`,
      onAction: startNewCards,
      actionTitle: "Start Quiz",
      actionIcon: Icon.Play,
      shortcut: { modifiers: ["cmd" as const], key: "2" as const },
    },
    {
      icon: Icon.Tag,
      title: "Study by Tags",
      subtitle: "Select Quiz Tags",
      onAction: startByTag,
      actionTitle: "Select Quiz Tags",
      actionIcon: Icon.ArrowRight,
      shortcut: { modifiers: ["cmd" as const], key: "3" as const },
    },
    {
      icon: Icon.Book,
      title: "All Cards",
      subtitle: `${allCards.length} cards`,
      onAction: startAll,
      actionTitle: "Start Quiz",
      actionIcon: Icon.Play,
      shortcut: { modifiers: ["cmd" as const], key: "4" as const },
    },
  ];

  return (
    <List navigationTitle="Select Quiz Mode">
      <List.Section title="Select Quiz Mode">
        {modes.map((mode, i) => (
          <List.Item
            key={i}
            icon={mode.icon}
            title={mode.title}
            subtitle={mode.subtitle}
            accessories={[{ text: `⌘${i + 1}` }]}
            actions={
              <ActionPanel>
                {/* Primary action (Enter) for the focused item. */}
                <Action title={mode.actionTitle} icon={mode.actionIcon} onAction={mode.onAction} />
                {/* Keep ⌘1-⌘4 available from every item. */}
                {modes
                  .filter((_, j) => j !== i)
                  .map((m) => (
                    <Action
                      key={m.title}
                      title={m.actionTitle + ` – ${m.title}`}
                      icon={m.actionIcon}
                      shortcut={m.shortcut}
                      onAction={m.onAction}
                    />
                  ))}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// ── Main quiz screen ──────────────────────────────────────────────────────────

// Main component for the quiz view.
export default function Quiz() {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function load() {
      const [cards, tagList] = await Promise.all([getAllCards(), getAllTags()]);
      setAllCards(cards);
      setTags(tagList);
      setIsLoading(false);
    }
    load();
  }, []);

  const wrongCount = allCards.filter((c) => c.progress === "wrong").length;
  const correctCount = allCards.filter((c) => c.progress === "correct").length;
  const newCount = allCards.filter((c) => c.progress === "unanswered").length;

  const summaryMd = `# 🃏 Flashcards Quiz

---

| | |
|---|---|
| Total Cards | **${allCards.length}** |
| New | **${newCount}** |
| Correct | **${correctCount}** |
| Wrong | **${wrongCount}** |

---

*Press Enter or click the action to select your quiz mode.*`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={summaryMd}
      actions={
        <ActionPanel>
          <Action
            title="Start Quiz"
            icon={Icon.Play}
            onAction={() => push(<ModeSelector allCards={allCards} tags={tags} />)}
          />
        </ActionPanel>
      }
    />
  );
}
