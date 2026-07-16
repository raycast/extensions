import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  showToast,
  Toast,
  Detail,
} from "@raycast/api";
import { useFlashcards } from "./utils/flashcardUtil";
import { Flashcard } from "./types";
import { AIModule, getProviderConfig } from "./utils/providerUtil";
import { playAudio } from "./utils/audioUtil";
import { useStories, SavedStory } from "./utils/storyUtil";
import { isCloseMatch } from "./utils/stringUtil";
import FlashcardForm from "./components/FlashcardForm";

type InsightData = {
  type: "reading" | "exercise";
  markdown?: string;
  question?: string;
  answer?: string;
  translation?: string;
};

function StoryScreen({
  words,
  topic,
  onSave,
}: {
  words: Flashcard[];
  topic: string;
  onSave: (data: Omit<SavedStory, "id" | "createdAt">) => void;
}) {
  const [data, setData] = useState<{
    english_text: string;
    vietnamese_translation: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    async function run() {
      try {
        const config = getProviderConfig();
        if (!config.apiKey)
          throw new Error("Please set API key in preferences.");
        const ai = new AIModule(config);
        const res = await ai.generateStory(
          words.map((w) => ({ term: w.term, definition: w.definition })),
          topic,
        );
        const parsed = JSON.parse(
          res.replace(/```json/g, "").replace(/```/g, ""),
        );
        if (isMounted) {
          setData(parsed);
          setIsLoading(false);
          onSave({
            topic: topic || "Daily Story",
            english_text: parsed.english_text,
            vietnamese_translation: parsed.vietnamese_translation,
            words: words.map((w) => ({
              term: w.term,
              definition: w.definition,
            })),
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(String(err));
          setIsLoading(false);
        }
      }
    }
    run();
    return () => {
      isMounted = false;
    };
  }, [words, topic]);

  if (error) return <Detail markdown={`⚠️ Lỗi khi tạo bài đọc: ${error}`} />;

  const markdown = data
    ? `
${data.english_text}

---
### 🇻🇳 Bản dịch
${data.vietnamese_translation}

---
### 📚 Từ vựng trong bài
` + words.map((w) => "- **" + w.term + "**: " + w.definition).join("\n")
    : "✨ Tác giả AI đang suy nghĩ cốt truyện và viết nháp...";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}

function StoryPromptForm({
  activeCards,
  dueCards,
  onSave,
}: {
  activeCards: Flashcard[];
  dueCards: Flashcard[];
  onSave: (data: Omit<SavedStory, "id" | "createdAt">) => void;
}) {
  const { push } = useNavigation();
  const [topic, setTopic] = useState("");
  const [pool, setPool] = useState("due");
  const [wordCount, setWordCount] = useState("10");

  function handleSubmit() {
    const source = pool === "due" ? dueCards : activeCards;
    if (source.length === 0) {
      showToast({
        title: "Không có từ vựng nào trong danh sách này.",
        style: Toast.Style.Failure,
      });
      return;
    }
    const count = parseInt(wordCount, 10);
    // shuffle and pick
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    push(<StoryScreen words={selected} topic={topic} onSave={onSave} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Tạo Bài Đọc" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Tạo một bài đọc tiếng Anh từ các từ vựng của bạn để ôn tập theo ngữ cảnh." />
      <Form.Dropdown
        id="pool"
        title="Nguồn từ vựng"
        value={pool}
        onChange={setPool}
      >
        <Form.Dropdown.Item
          value="due"
          title={"Đến hạn ôn tập (" + dueCards.length + " từ)"}
        />
        <Form.Dropdown.Item
          value="all"
          title={"Tất cả từ vựng (" + activeCards.length + " từ)"}
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="count"
        title="Số lượng từ"
        value={wordCount}
        onChange={setWordCount}
      >
        <Form.Dropdown.Item value="5" title="5 từ (Ngắn gọn)" />
        <Form.Dropdown.Item value="10" title="10 từ (Vừa đủ)" />
        <Form.Dropdown.Item value="15" title="15 từ (Khá dài)" />
        <Form.Dropdown.Item value="20" title="20 từ (Dài)" />
      </Form.Dropdown>
      <Form.TextField
        id="topic"
        title="Chủ đề (Tuỳ chọn)"
        placeholder="VD: Khoa học vũ trụ, Chuyện kinh dị, Tình yêu..."
        value={topic}
        onChange={setTopic}
      />
    </Form>
  );
}

function ExerciseScreen({
  data,
  onNext,
}: {
  data: InsightData;
  onNext: () => void;
}) {
  const { pop } = useNavigation();
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string>();

  function handleSubmit() {
    if (showResult) {
      pop();
      onNext();
      return;
    }
    if (!userAnswer.trim()) {
      setError("Please type your answer.");
      return;
    }
    const correct =
      userAnswer.trim().toLowerCase() === data.answer!.toLowerCase();
    if (correct) {
      showToast({ title: "Correct!", style: Toast.Style.Success });
      setShowResult(true);
    } else {
      setError("Incorrect! Try again.");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={showResult ? "Continue" : "Submit Answer"}
            onSubmit={handleSubmit}
          />
          {showResult && (
            <Action
              title="Listen"
              icon={Icon.SpeakerOn}
              onAction={() => playAudio(data.answer!)}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          )}
          <Action
            title="Skip"
            onAction={() => {
              pop();
              onNext();
            }}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Fill in the blank with the word you just learned!" />
      <Form.Separator />
      <Form.Description text={`🇺🇸 ${data.question}`} />
      <Form.Description text={`🇻🇳 ${data.translation}`} />

      {!showResult ? (
        <Form.TextField
          id="ans"
          title="Your Answer"
          value={userAnswer}
          onChange={(v) => {
            setUserAnswer(v);
            setError(undefined);
          }}
          error={error}
        />
      ) : (
        <Form.Description text={`✅ Correct! The word is: ${data.answer}`} />
      )}
    </Form>
  );
}

function InsightScreen({
  flashcard,
  onNext,
  addInsight,
}: {
  flashcard: Flashcard;
  onNext: () => void;
  addInsight: (id: string, insight: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchInsight() {
      try {
        const cachedInsights = flashcard.insights || [];
        let shouldFetchNew = true;

        if (cachedInsights.length >= 3) {
          shouldFetchNew = Math.random() < 0.2; // 20% chance to fetch new
        } else if (cachedInsights.length > 0) {
          shouldFetchNew = Math.random() < 0.5; // 50% chance
        }

        if (!shouldFetchNew && cachedInsights.length > 0) {
          const randomInsightStr =
            cachedInsights[Math.floor(Math.random() * cachedInsights.length)];
          if (isMounted) {
            try {
              setInsightData(JSON.parse(randomInsightStr));
            } catch (e) {
              setInsightData({ type: "reading", markdown: randomInsightStr });
            }
            setIsLoading(false);
          }
          return;
        }

        const config = getProviderConfig();
        if (!config.apiKey) {
          if (isMounted) {
            setInsightData({
              type: "reading",
              markdown:
                "⚠️ Please set your API key in preferences to see AI Insights.",
            });
            setIsLoading(false);
          }
          return;
        }

        const ai = new AIModule(config);
        const newInsightStr = await ai.generateVocabInsight(
          flashcard.term,
          flashcard.definition,
        );

        let parsed: InsightData;
        try {
          parsed = JSON.parse(
            newInsightStr.replace(/```json/g, "").replace(/```/g, ""),
          );
        } catch (e) {
          parsed = { type: "reading", markdown: newInsightStr };
        }

        if (isMounted) {
          setInsightData(parsed);
          setIsLoading(false);
        }

        // Save to cache (save as string)
        await addInsight(flashcard.id, JSON.stringify(parsed));
      } catch (error) {
        if (isMounted) {
          setInsightData({
            type: "reading",
            markdown:
              "⚠️ Could not generate insight. Please check your internet or API key.",
          });
          setIsLoading(false);
        }
      }
    }
    fetchInsight();
    return () => {
      isMounted = false;
    };
  }, [flashcard]);

  if (!isLoading && insightData?.type === "exercise") {
    return <ExerciseScreen data={insightData} onNext={onNext} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={insightData?.markdown || "✨ Generating AI Insight..."}
      actions={
        <ActionPanel>
          <Action
            title="Continue to Next Flashcard"
            icon={Icon.Forward}
            onAction={() => {
              pop(); // Pop InsightScreen
              onNext(); // This will trigger handleNext which pops QuizScreen
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function QuizScreen({
  flashcard,
  onNext,
  addInsight,
  insightData,
}: {
  flashcard: Flashcard;
  onNext: (isCorrect: boolean) => void;
  addInsight: (id: string, insight: string) => Promise<void>;
  insightData?: InsightData;
}) {
  const { push, pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();
  const [showResult, setShowResult] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>();

  // Randomly decide which side to show
  const [isReverse] = useState(() => Math.random() > 0.5);

  const questionText = isReverse ? flashcard.term : flashcard.definition;
  const expectedAnswer = isReverse ? flashcard.definition : flashcard.term;

  async function handleSubmit() {
    if (showResult) {
      onNext(isAnswerCorrect);
      return;
    }

    if (insightData) {
      push(
        <InsightScreen
          flashcard={flashcard}
          onNext={() => onNext(isAnswerCorrect)}
          addInsight={addInsight}
        />,
      );
      return;
    }

    if (!userAnswer.trim()) {
      setError("Please type your answer.");
      return;
    }

    // If guessing the TERM (vocab), we require strict matching to enforce correct spelling.
    if (!isReverse) {
      const isCorrect =
        userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
      setIsAnswerCorrect(isCorrect);
      setShowResult(true);
      setAiFeedback(undefined);
      if (isCorrect) {
        showToast({ style: Toast.Style.Success, title: "Correct!" });
      } else {
        showToast({ style: Toast.Style.Failure, title: "Incorrect" });
      }
      return;
    }

    // Fast path for DEFINITION
    if (isCloseMatch(userAnswer, expectedAnswer)) {
      setIsAnswerCorrect(true);
      setShowResult(true);
      setAiFeedback(undefined);
      showToast({ style: Toast.Style.Success, title: "Correct!" });
      return;
    }

    // AI Semantic Path
    setIsGrading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🧠 AI is grading...",
    });
    try {
      const config = getProviderConfig();
      if (!config.apiKey) throw new Error("API key not set");
      const ai = new AIModule(config);
      const grade = await ai.gradeAnswer(expectedAnswer, userAnswer);

      setIsAnswerCorrect(grade.isCorrect);
      setAiFeedback(grade.feedback);
      setShowResult(true);

      if (grade.isCorrect) {
        toast.style = Toast.Style.Success;
        toast.title = "Correct!";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Incorrect";
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error grading answer";
      setIsAnswerCorrect(false);
      setAiFeedback(undefined);
      setShowResult(true);
    } finally {
      setIsGrading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={showResult ? "Next Card" : "Submit Answer"}
            onSubmit={handleSubmit}
          />
          <Action
            title="Listen to Question"
            icon={Icon.SpeakerOn}
            onAction={() => playAudio(questionText)}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
          {showResult && (
            <Action
              title="Listen to Answer"
              icon={Icon.SpeakerOn}
              onAction={() => playAudio(expectedAnswer)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          )}
          <Action
            title="Skip"
            onAction={() => onNext(false)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Exit Quiz"
            onAction={() => pop()}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          isReverse
            ? "Type the DEFINITION for this term:"
            : "Type the TERM that matches this definition:"
        }
      />
      <Form.Description text={`Question: ${questionText}`} />

      {showResult && (
        <>
          <Form.Separator />
          <Form.Description
            text={
              isAnswerCorrect
                ? "✅ Correct!"
                : `❌ Incorrect! The right answer is: ${expectedAnswer}`
            }
          />
          {aiFeedback && (
            <Form.Description text={`🧠 AI Feedback: ${aiFeedback}`} />
          )}
          {flashcard.example && (
            <Form.Description text={`💡 Example: ${flashcard.example}`} />
          )}
        </>
      )}

      <Form.Separator />

      {!showResult ? (
        <Form.TextField
          id="answer"
          title="Your Answer"
          placeholder={isGrading ? "🧠 AI is grading..." : "Type here..."}
          value={userAnswer}
          error={error}
          onChange={(val) => {
            setUserAnswer(val);
            setError(undefined);
          }}
        />
      ) : (
        <Form.Description text={`Your Answer: ${userAnswer}`} />
      )}
    </Form>
  );
}

export default function PracticeCommand() {
  const { data, isLoading, addInsight, updateStats, remove } = useFlashcards();
  const { stories, isLoadingStories, addStory, removeStory } = useStories();
  const { push, pop } = useNavigation();
  const [mode, setMode] = useState<"manage" | "quiz" | "stories">("manage");
  const quizFilterRef = React.useRef<"due" | "all">("due");

  function getActiveCards(filter: "due" | "all") {
    if (filter === "all") return data;
    return data.filter((card) => {
      if (!card.dueDate) return true;
      return new Date(card.dueDate) <= new Date();
    });
  }

  function startQuiz(filter: "due" | "all") {
    quizFilterRef.current = filter;
    const activeCards = getActiveCards(filter);

    if (activeCards.length === 0) {
      if (filter === "due") {
        showToast({
          style: Toast.Style.Failure,
          title: "You're all caught up!",
          message: "No flashcards due today.",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No flashcards",
          message: "You don't have any flashcards yet.",
        });
      }
      return;
    }

    // Pick a random card from active cards
    const randomCard =
      activeCards[Math.floor(Math.random() * activeCards.length)];
    push(
      <QuizScreen
        flashcard={randomCard}
        onNext={(isCorrect) => handleNext(randomCard.id, isCorrect)}
        addInsight={addInsight}
      />,
    );
  }

  async function handleNext(cardId: string, isCorrect: boolean) {
    await updateStats(cardId, isCorrect);
    pop(); // Close current form

    // Slight delay to allow toast and UI update
    setTimeout(() => {
      const activeCards = getActiveCards(quizFilterRef.current);
      // Remove the one just answered if we are in "due" mode and it was correct?
      // Actually, if it's "all" mode, they could practice infinitely. To prevent infinite loops on the same card immediately,
      // let's just pick any card, maybe excluding the one they just did if there are others.
      const availableCards = activeCards.filter(
        (c) => c.id !== cardId || activeCards.length === 1,
      );

      // If due mode, we should really only show it if it's still due.
      // updateStats changes the dueDate, so if they answered, its dueDate is now in the future (even if wrong, it's due tomorrow).
      // So if getActiveCards is called with fresh data, it might already exclude it.
      // But React hook state `data` might be stale inside this timeout if we don't use a ref.
      // So filtering out `cardId` manually is a safe approximation for the immediate next question.
      let nextCards = availableCards;
      if (quizFilterRef.current === "due") {
        nextCards = availableCards.filter((c) => c.id !== cardId || !isCorrect);
      }

      if (nextCards.length > 0) {
        const randomCard =
          nextCards[Math.floor(Math.random() * nextCards.length)];
        push(
          <QuizScreen
            flashcard={randomCard}
            onNext={(isC) => handleNext(randomCard.id, isC)}
            addInsight={addInsight}
          />,
        );
      } else {
        showToast({ style: Toast.Style.Success, title: "Session Complete!" });
      }
    }, 100);
  }

  const dueCount = getActiveCards("due").length;

  return (
    <List
      isLoading={isLoading || isLoadingStories}
      isShowingDetail={mode === "manage" || mode === "stories"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Mode"
          onChange={(val) => setMode(val as "manage" | "quiz" | "stories")}
          value={mode}
        >
          <List.Dropdown.Item title="Manage Flashcards" value="manage" />
          <List.Dropdown.Item title="Quiz Mode" value="quiz" />
          <List.Dropdown.Item title="Saved Stories" value="stories" />
        </List.Dropdown>
      }
    >
      {mode === "stories" && (
        <List.Section
          title="Saved Stories"
          subtitle={`${stories.length} stories`}
        >
          {stories.length === 0 ? (
            <List.EmptyView title="No saved stories yet" icon={Icon.Book} />
          ) : (
            stories.map((story) => (
              <List.Item
                key={story.id}
                title={story.topic}
                subtitle={new Date(story.createdAt).toLocaleDateString()}
                detail={
                  <List.Item.Detail
                    markdown={`# ${story.topic}\n\n${story.english_text}\n\n---\n\n### 🇻🇳 Bản dịch\n${story.vietnamese_translation}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={new Date(story.createdAt).toLocaleString()}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        {story.words.map((w, idx) => (
                          <List.Item.Detail.Metadata.Label
                            key={idx}
                            title={w.term}
                            text={w.definition}
                          />
                        ))}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Listen to Story"
                      icon={Icon.SpeakerOn}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={() => playAudio(story.english_text)}
                    />
                    <Action
                      title="Delete Story"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => {
                        removeStory(story.id);
                        showToast({ title: "Story deleted" });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))
          )}
        </List.Section>
      )}

      {mode === "manage" && (
        <List.Section
          title="Your Flashcards"
          subtitle={`${data.length} total, ${dueCount} due today`}
        >
          {data.length === 0 ? (
            <List.EmptyView
              title="No Flashcards"
              description="Save items from History or create a new one to get started."
              icon={Icon.Book}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Generate Story with AI"
                    icon={Icon.TextDocument}
                    target={
                      <StoryPromptForm
                        activeCards={data}
                        dueCards={getActiveCards("due")}
                        onSave={addStory}
                      />
                    }
                  />
                  <Action.Push
                    title="Create Flashcard"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<FlashcardForm />}
                  />
                </ActionPanel>
              }
            />
          ) : (
            data.map((card) => (
              <List.Item
                key={card.id}
                title={card.term}
                subtitle={card.definition}
                accessories={[
                  {
                    text: `✅ ${card.correctCount}`,
                    tooltip: "Correct answers",
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`# ${card.term}\n\n**Meaning:** ${card.definition}\n\n${card.example ? `**Example:**\n\n${card.example}` : ""}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Interval"
                          text={`${card.interval} days`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Ease Factor"
                          text={card.easeFactor?.toString()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Correct"
                          text={card.correctCount.toString()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Wrong"
                          text={card.wrongCount.toString()}
                        />
                        {card.insights && card.insights.length > 0 && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="AI Insights Cached"
                              text={card.insights.length.toString()}
                            />
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Listen to Word"
                      icon={Icon.SpeakerOn}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={() => playAudio(card.term)}
                    />
                    <Action
                      title="Start Due Cards Quiz"
                      icon={Icon.Play}
                      onAction={() => startQuiz("due")}
                    />
                    <Action
                      title="Start Cram Quiz (all)"
                      icon={Icon.Forward}
                      onAction={() => startQuiz("all")}
                    />
                    <Action.Push
                      title="Generate Story with AI"
                      icon={Icon.TextDocument}
                      shortcut={{ modifiers: ["cmd"], key: "g" }}
                      target={
                        <StoryPromptForm
                          activeCards={data}
                          dueCards={getActiveCards("due")}
                          onSave={addStory}
                        />
                      }
                    />
                    <Action.Push
                      title="Create Flashcard"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<FlashcardForm />}
                    />
                    <Action
                      title="Delete Flashcard"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => remove(card.id)}
                    />
                  </ActionPanel>
                }
              />
            ))
          )}
        </List.Section>
      )}

      {mode === "quiz" && (
        <List.Section title="Practice">
          <List.Item
            title={
              dueCount === 0 ? "You're all caught up!" : "Start Vocabulary Quiz"
            }
            subtitle={
              dueCount === 0
                ? "No cards due today."
                : `${dueCount} cards due today`
            }
            icon={dueCount === 0 ? Icon.CheckCircle : Icon.GameController}
            actions={
              <ActionPanel>
                {dueCount > 0 && (
                  <Action
                    title="Start Due Cards Quiz"
                    icon={Icon.Play}
                    onAction={() => startQuiz("due")}
                  />
                )}
                <Action
                  title="Start Cram Quiz (all Cards)"
                  icon={Icon.Forward}
                  onAction={() => startQuiz("all")}
                />
                <Action.Push
                  title="Generate Story with AI"
                  icon={Icon.TextDocument}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                  target={
                    <StoryPromptForm
                      activeCards={data}
                      dueCards={getActiveCards("due")}
                      onSave={addStory}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
