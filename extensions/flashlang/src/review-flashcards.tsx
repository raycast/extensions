import { useEffect, useState } from "react";
import { Detail, ActionPanel, Action, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { FlashcardRecord, getFlashcards } from "./utils/flashcards";

export default function ReviewFlashcard() {
  const [flashcards, setFlashcards] = useState<FlashcardRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShowingAnswer, setIsShowingAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFlashcards = async () => {
      try {
        const cards = await getFlashcards();
        console.log("cards :", cards);
        setFlashcards(cards);
      } catch (error) {
        console.error("Failed to load flashcards:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFlashcards();
  }, []);

  const handleNextCard = () => {
    setIsShowingAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handleProficiencyUpdate = async (level: number) => {
    const updatedFlashcards = [...flashcards];
    updatedFlashcards[currentIndex] = {
      ...updatedFlashcards[currentIndex],
      proficiency: level,
      lastReviewed: new Date().toISOString(),
    };
    setFlashcards(updatedFlashcards);
    try {
      await LocalStorage.setItem("flashcards", JSON.stringify(updatedFlashcards));
      handleNextCard();
    } catch (error) {
      showFailureToast(error, { title: "Failed to save flashcard progress" });
    }
  };

  if (isLoading) {
    return <Detail markdown="Loading flashcards..." />;
  }

  if (flashcards.length === 0) {
    return <Detail markdown="No flashcards available. Add some cards first!" />;
  }

  const currentCard = flashcards[currentIndex];
  console.log("currentCard :", currentCard);

  return (
    <Detail
      markdown={`
# ${currentCard.vocabulary}

${isShowingAnswer ? `\n${currentCard.translation}` : ""}

---
**Progress**: Card ${currentIndex + 1} of ${flashcards.length}
${currentCard.lastReviewed ? `\nLast reviewed: ${new Date(currentCard.lastReviewed).toLocaleDateString()}` : ""}
\nProficiency Level: ${"⭐".repeat(currentCard.proficiency)}
      `}
      actions={
        <ActionPanel>
          {!isShowingAnswer ? (
            <Action
              title="Show Answer"
              onAction={() => setIsShowingAnswer(true)}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
          ) : (
            <>
              <ActionPanel.Section>
                {[1, 2, 3, 4, 5].map((level) => (
                  <Action
                    key={level}
                    title={`Rate ${level} ${"⭐".repeat(level)}`}
                    onAction={() => handleProficiencyUpdate(level)}
                    shortcut={{ modifiers: ["cmd"], key: level.toString() as "1" | "2" | "3" | "4" | "5" }}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action title="Next Card" onAction={handleNextCard} shortcut={{ modifiers: ["cmd"], key: "n" }} />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
