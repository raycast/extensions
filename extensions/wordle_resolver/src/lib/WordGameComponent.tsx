import { useState, useMemo } from "react";
import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { WordSelector, type WordFeedback, type LetterFeedback } from "./wordSelector";
import type { LanguageConfig } from "./languageConfig";

type Values = {
  nbLetters: string;
  letter0?: string;
  letter1?: string;
  letter2?: string;
  letter3?: string;
  letter4?: string;
  letter5?: string;
  letter6?: string;
  letter7?: string;
};

interface WordGameProps {
  config: LanguageConfig;
}

export function WordGameComponent({ config }: WordGameProps) {
  const [wordLength, setWordLength] = useState<number>(5);
  const [testedWords, setTestedWords] = useState<WordFeedback[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>("");
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);

  const wordSelector = useMemo(() => new WordSelector(config), [config]);

  const generateSuggestion = (customTestedWords?: WordFeedback[], customLength?: number) => {
    const wordsToFilter = customTestedWords || testedWords;
    const lengthToUse = customLength || wordLength;
    const suggestion = wordSelector.selectWord(lengthToUse, wordsToFilter);

    if (!suggestion) {
      showToast({
        title: config.ui.noSuggestionTitle,
        message: config.ui.noSuggestionMessage,
      });
      return;
    }

    setCurrentSuggestion(suggestion.toUpperCase());
    setShowFeedbackForm(true);
  };

  const handleLengthSubmit = (values: Values) => {
    const length = parseInt(values.nbLetters);
    setWordLength(length);
    setTestedWords([]);
    setCurrentSuggestion("");
    setShowFeedbackForm(false);

    showToast({
      title: config.ui.lengthSetTitle,
      message: config.ui.lengthSetMessage(length),
    });
    generateSuggestion(undefined, length);
  };

  const handleFeedbackSubmit = (values: Values) => {
    if (!currentSuggestion) return;

    const feedback: LetterFeedback[] = [];
    for (let i = 0; i < wordLength; i++) {
      const letterFeedback = values[`letter${i}` as keyof Values] as LetterFeedback;
      feedback.push(letterFeedback || "unknown");
    }

    const newWordFeedback: WordFeedback = {
      word: currentSuggestion,
      feedback: feedback,
    };

    const updatedTestedWords = [...testedWords, newWordFeedback];

    setTestedWords(updatedTestedWords);
    setShowFeedbackForm(false);
    showToast({
      title: config.ui.feedbackSavedTitle,
      message: config.ui.feedbackSavedMessage,
    });

    generateSuggestion(updatedTestedWords);
  };

  const reset = () => {
    setTestedWords([]);
    setCurrentSuggestion("");
    setShowFeedbackForm(false);
    wordSelector.clearCache();
    showToast({
      title: config.ui.resetTitle,
      message: config.ui.resetMessage,
    });
  };

  // Generate length options based on config
  const lengthOptions = [];
  for (let i = config.wordFilter.minLength; i <= config.wordFilter.maxLength; i++) {
    lengthOptions.push(<Form.Dropdown.Item key={i} value={i.toString()} title={`${i} ${config.ui.lettersUnit}`} />);
  }

  if (!showFeedbackForm) {
    return (
      <Form
        actions={
          <ActionPanel>
            {!currentSuggestion && (
              <Action.SubmitForm title={config.ui.setLengthAction} onSubmit={handleLengthSubmit} />
            )}
            {currentSuggestion && <Action title={config.ui.newSuggestionAction} onAction={generateSuggestion} />}
            {(currentSuggestion || testedWords.length > 0) && (
              <Action title={config.ui.getSuggestionAction} onAction={generateSuggestion} />
            )}
            {testedWords.length > 0 && <Action title={config.ui.resetAction} onAction={reset} />}
          </ActionPanel>
        }
      >
        <Form.Dropdown id="nbLetters" title={config.ui.lengthLabel}>
          {lengthOptions}
        </Form.Dropdown>

        {currentSuggestion && (
          <Form.Description
            title={config.ui.suggestionLabel}
            text={`${config.ui.tryWordLabel}: ${currentSuggestion}`}
          />
        )}
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={config.ui.submitFeedbackAction} onSubmit={handleFeedbackSubmit} />
          <Action title={config.ui.cancelAction} onAction={() => setShowFeedbackForm(false)} />
        </ActionPanel>
      }
    >
      <Form.Description title={config.ui.suggestionLabel} text={`${config.ui.feedbackPrompt}: ${currentSuggestion}`} />

      {Array.from({ length: wordLength }, (_, i) => (
        <Form.Dropdown key={i} id={`letter${i}`} title={`${config.ui.letterLabel} ${i + 1} (${currentSuggestion[i]})`}>
          <Form.Dropdown.Item value="correct" title={`✅ ${config.ui.correctPositionLabel}`} />
          <Form.Dropdown.Item value="wrong-position" title={`🟡 ${config.ui.wrongPositionLabel}`} />
          <Form.Dropdown.Item value="not-in-word" title={`❌ ${config.ui.notInWordLabel}`} />
        </Form.Dropdown>
      ))}

      {testedWords.length > 0 && (
        <Form.Description
          title={config.ui.testedWordsLabel}
          text={`${testedWords.length} ${config.ui.testedWordCount}: ${testedWords.map((w) => w.word).join(", ")}`}
        />
      )}

      {wordSelector.getAllWords(wordLength).length > 0 &&
        (() => {
          const analysis = wordSelector.getWordAnalysis(wordLength, testedWords);
          const reductionPercentage = ((1 - analysis.reductionRatio) * 100).toFixed(1);
          return (
            <Form.Description
              title={config.ui.analysisLabel}
              text={`${analysis.remainingWords}/${analysis.totalWords} ${config.ui.wordsRemainingLabel} (${reductionPercentage}% ${config.ui.eliminatedLabel})${
                analysis.averageScore ? ` - ${config.ui.averageScoreLabel}: ${analysis.averageScore.toFixed(1)}` : ""
              }`}
            />
          );
        })()}
    </Form>
  );
}
