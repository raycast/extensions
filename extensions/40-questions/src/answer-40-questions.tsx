import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ensureQuestionsLoaded, loadQuestionsFile, saveAnswer, loadAnswersFile } from "./storage";
import { AnswersFile, QuestionsFile } from "./types";
import { currentYear } from "./questions";

export default function Command({
  initialQuestionNumber = 1,
  initialYear = currentYear,
  onChange,
}: {
  initialQuestionNumber?: number;
  initialYear?: number;
  onChange?: () => void;
}) {
  const prefs = getPreferenceValues<{ language?: string; questionsRepo?: string }>();
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionsFile | null>(null);
  const [answers, setAnswers] = useState<AnswersFile>({});

  useEffect(() => {
    (async () => {
      try {
        await ensureQuestionsLoaded(prefs.language ?? "en", prefs.questionsRepo);
      } catch (e: unknown) {
        console.debug("ensureQuestionsLoaded error", e);
      }

      try {
        const lang = prefs.language ?? "en";
        const loaded = await loadQuestionsFile(lang);
        const loadedAnswers = await loadAnswersFile();
        setAnswers(loadedAnswers);

        if (loaded) {
          setQuestions(loaded);
          // set initial question
          if ((loaded as QuestionsFile)[initialQuestionNumber]) {
            setCurrentQuestion((loaded as QuestionsFile)[initialQuestionNumber]);
            setQuestionNumber(initialQuestionNumber);
            const yearAnswers = loadedAnswers[initialYear ?? currentYear];
            if (yearAnswers) {
              const answer = yearAnswers[initialQuestionNumber.toString()];
              if (answer) {
                setAnswerText(answer.response);
              }
            }
          }
        }
      } catch (e) {
        console.debug(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(initialQuestionNumber);
  const [activeYear, setActiveYear] = useState<number | null>(initialYear ?? null);
  const [answerText, setAnswerText] = useState<string>("");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit() {
    if (!currentQuestion || !questionNumber || !activeYear) {
      showToast({ style: Toast.Style.Failure, title: "No question loaded" });
      return;
    }
    if (answerText.trim().length === 0) {
      setErrorText("Required");
      return;
    }
    setErrorText("");
    const payload = {
      id: currentYear + "_" + questionNumber,
      questionId: questionNumber,
      response: answerText,
      language: prefs.language ?? "en",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveAnswer(activeYear, questionNumber, payload);
    showToast({ style: Toast.Style.Success, title: "Saved answer" });
    if (onChange) {
      onChange();
      pop();
    } else {
      handleNavigation();
    }
  }

  async function handleNavigation(back: boolean = false) {
    if (!questions) return;
    const maxQuestion = Object.keys(questions).length - 1;
    let newQuestionNumber = back ? questionNumber - 1 : questionNumber + 1;
    if (newQuestionNumber < 1) newQuestionNumber = 1;
    if (newQuestionNumber > maxQuestion) newQuestionNumber = maxQuestion;
    const newQuestion = questions[newQuestionNumber];

    // prefill answer
    const existingAnswer = answers[activeYear ?? currentYear]
      ? answers[activeYear ?? currentYear][newQuestionNumber.toString()]
      : undefined;
    if (existingAnswer) {
      setAnswerText(existingAnswer.response);
    } else {
      setAnswerText("");
    }
    if (newQuestion) {
      setQuestionNumber(newQuestionNumber);
      setCurrentQuestion(newQuestion);
      setErrorText("");
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Answer" onSubmit={handleSubmit} />
          <Action
            title="Next Question"
            onAction={() => handleNavigation(false)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
          />
          <Action
            title="Previous Question"
            onAction={() => handleNavigation(true)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={"Question " + questionNumber} text={currentQuestion || "Missing Question"} />
      {currentQuestion ? (
        <>
          <Form.TextArea
            id="answer"
            title="Answer"
            value={answerText}
            onChange={(value) => {
              if (errorText) {
                setErrorText("");
              }
              setAnswerText(value);
            }}
            error={errorText}
          />
        </>
      ) : (
        <Form.Description text="No questions available. Check the preferences." />
      )}
      <Form.Dropdown
        id="year"
        title="Year"
        value={String(activeYear ?? currentYear)}
        onChange={(value) => setActiveYear(Number(value))}
      >
        {Array.from({ length: 10 }, (_, i) => currentYear - i).map((year) => (
          <Form.Dropdown.Item key={year} title={year.toString()} value={year.toString()} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
