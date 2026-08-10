import {
  List,
  Action,
  ActionPanel,
  Toast,
  showToast,
  LocalStorage,
  AI,
  Icon,
  getPreferenceValues,
  Clipboard,
  openCommandPreferences,
} from "@raycast/api";

import { useState, useRef, useEffect } from "react";
import { markdownTemplates } from "./markdown-templates";

// Define interfaces for type safety
interface SnackStats {
  correctAnswers: number;
  totalAnswers: number;
  daysPlayed: string[];
  totalSnacks: number;
}

interface PastSnack {
  title: string;
  question: string;
  content: string;
}

interface QuizData {
  title: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  correctOption: string;
  answer: string;
}

export default function Snack(): JSX.Element {
  // Quiz result messages
  const successMessages = ["Great job!", "Well done!", "Nice work!", "Yes!", "Absolutely!"];
  const failureMessages = ["Nooooo 🙂‍↔️", "Not quite. 🤷", "Oops, that's wrong. 🤷", "That's not it! 🙂‍↔️"];

  // State management
  const [pastSnacks, setPastSnacks] = useState<PastSnack[]>([]);
  const [guess, setGuess] = useState<string>("");
  const [option1, setOption1] = useState<string>("");
  const [option2, setOption2] = useState<string>("");
  const [option3, setOption3] = useState<string>("");
  const [uiLoading, setUILoading] = useState<boolean>(false);
  const [newSnackTitle, setNewSnackTitle] = useState<string>("New Snack");
  const [markdown, setMarkdown] = useState<string>("");
  const [stats, setStats] = useState<SnackStats>({
    correctAnswers: 0,
    totalAnswers: 0,
    daysPlayed: [],
    totalSnacks: 0,
  });

  // Refs for values that don't trigger re-renders
  const loading = useRef<boolean>(false);
  const hasGuessed = useRef<boolean>(false);
  const topic = useRef<string>("");
  const refreshTopic = useRef<boolean>(false);

  const correctOption = useRef<string>("");
  const answer = useRef<string>("");
  const question = useRef<string>("");
  const title = useRef<string>("");

  // AI prompt for generating questions
  const prompt = `Generate a question about learning {topic} in less than 30 words and provide three multiple choice answer options with less than 40 words. Also provide a more detailed answer text in less than 80 words that is shown after answering the quiz. Give a one or two worded title that summarizes the essence of the question without revealing the answer, but it should not be too generic. Make sure the question is also interesting for people familiar with the domain. Use emojis in the detailed answer whenever it fits. Add URLs from Wikipedia or other standard knowledge sources to terms in the text that might be unclear. Highlight the most important parts in the answer bold (markdown). {past_questions}Generate text in the format 'Title: ..., Question: ..., Option 1: ..., Option 2: ..., Option 3: ..., Correct Option: 1, 2 or 3, Detailed Answer: ...'`;

  // Update quiz markdown when options or question changes
  useEffect(() => {
    if (question.current !== "" && hasGuessed.current === false) {
      setMarkdown(
        markdownTemplates.quiz
          .replace("{question}", question.current)
          .replace("{option1}", option1)
          .replace("{option2}", option2)
          .replace("{option3}", option3),
      );
    }
  }, [option1, option2, option3]);

  // Parse AI response into structured quiz data
  const parseQuizData = (data: string): QuizData => {
    const parsedData: Partial<QuizData> = {};

    parsedData.title = data.split("Title:")[1]?.split("Question:")[0]?.trim().replace(/\*\*/g, "") || "";
    parsedData.question = data.split("Question:")[1]?.split("Option 1:")[0]?.trim() || "";

    parsedData.option1 = data.split("Option 1:")[1]?.split("Option 2:")[0]?.trim() || "";
    parsedData.option2 = data.split("Option 2:")[1]?.split("Option 3:")[0]?.trim() || "";
    parsedData.option3 = data.split("Option 3:")[1]?.split("Correct Option:")[0]?.trim() || "";

    const correctOptionRaw = data.split("Correct Option:")[1]?.split("Detailed Answer:")[0]?.trim() || "";
    const correctOptionMatch = correctOptionRaw.match(/\d/);
    parsedData.correctOption = correctOptionMatch ? correctOptionMatch[0] : "1";

    parsedData.answer = data.split("Detailed Answer:")[1]?.trim() || "";

    return parsedData as QuizData;
  };

  // Build text of past questions to avoid repetition
  const buildPastQuestionsText = async (): Promise<string> => {
    const storedSnacks = await LocalStorage.getItem<string>("pastSnacks");

    if (storedSnacks !== undefined) {
      const parsedStoredSnacks: PastSnack[] = JSON.parse(storedSnacks);
      setPastSnacks(parsedStoredSnacks);

      const pastQuestions = parsedStoredSnacks.map((snack) => `${snack.title}: ${snack.question}`).join(", ");

      return `Do not repeat a question and title and do not ask the same type of questions multiple times. The previous ones were: ${pastQuestions} `;
    }
    return "";
  };

  // Fetch a new snack from AI
  const fetchSnack = async (): Promise<void> => {
    if (!loading.current) {
      loading.current = true;
      setUILoading(true);
      console.log("Fetching new snack...");

      // Refresh topic if preferences were opened
      if (refreshTopic.current) {
        await fetchTopic();
        console.log("Chosen topic: " + topic.current);
        refreshTopic.current = false;
      }

      setNewSnackTitle("New Snack");
      setMarkdown(markdownTemplates.loading.replace("{topic}", topic.current));

      // Include avoiding past questions in the prompt
      const pastQuestionText = await buildPastQuestionsText();

      // Prompt AI for a new snack
      let retries = 0;
      while (retries < 2) {
        try {
          const data = await AI.ask(
            prompt.replace("{past_questions}", pastQuestionText).replace("{topic}", topic.current),
            { creativity: 2 },
          );

          const response = parseQuizData(data);

          title.current = response.title;
          question.current = response.question;

          setNewSnackTitle("New Snack: " + title.current);

          setOption1(response.option1);
          setOption2(response.option2);
          setOption3(response.option3);

          correctOption.current = response.correctOption;
          answer.current = response.answer;

          loading.current = false;
          hasGuessed.current = false;
          setUILoading(false);
          break;
        } catch (error) {
          console.error("Error fetching quiz:", error);
          retries++;
        }
      }

      // If the retries are exhausted, show an error message
      if (loading.current === true) {
        setMarkdown(markdownTemplates.error);
        setUILoading(false);
        loading.current = false;
      }
    }
  };

  // Load statistics from local storage
  const loadStats = async (): Promise<void> => {
    const storedStats = await LocalStorage.getItem<string>("snackStats");

    if (storedStats !== undefined) {
      const parsedStats: SnackStats = JSON.parse(storedStats);
      setStats(parsedStats);
    }
  };

  const fetchTopic = async (): Promise<void> => {
    // Get learning topic from preferences
    const preferences = getPreferenceValues<Preferences>();

    // Limit topic to 150 characters and make title case
    topic.current =
      preferences.topic.substring(0, 150).charAt(0).toUpperCase() + preferences.topic.substring(0, 150).slice(1);
  };

  // Load stats and fetch first snack on component mount
  useEffect(() => {
    loadStats();
    fetchTopic();
    fetchSnack();
  }, []);

  // Process user's guess
  const processGuess = (guess: string, guessText: string): void => {
    // Trim trailing period if present
    if (guessText.endsWith(".")) {
      guessText = guessText.slice(0, -1);
    }

    const successMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
    const failureMessage = `_${guessText}?_ ${failureMessages[Math.floor(Math.random() * failureMessages.length)]}`;

    const wasCorrect = guess === correctOption.current;

    showToast({
      style: wasCorrect ? Toast.Style.Success : Toast.Style.Failure,
      title: wasCorrect ? "Correct!" : "Incorrect!",
    });

    const filledAnswerMarkdown = markdownTemplates.answer
      .replace("{question}", question.current)
      .replace("{answer}", answer.current);

    setMarkdown(filledAnswerMarkdown.replace("{resultMessage}", wasCorrect ? successMessage : failureMessage));

    setGuess("");
    hasGuessed.current = true;

    // Update past snacks
    const updatedPastSnacks: PastSnack[] = [
      {
        title: title.current,
        question: question.current,
        // Save answer without result message
        content: filledAnswerMarkdown.replace("{resultMessage}", ""),
      },
      ...pastSnacks,
    ];

    // Limit past snacks to 50
    const limitedPastSnacks = updatedPastSnacks.slice(0, 50);

    // Save to local storage
    (async () => {
      await LocalStorage.setItem("pastSnacks", JSON.stringify(limitedPastSnacks));
    })();

    setPastSnacks(limitedPastSnacks);
    setNewSnackTitle("Snacked: " + title.current);

    // Update statistics
    setStats((oldStats) => {
      const newStats: SnackStats = structuredClone(oldStats);
      newStats.correctAnswers += wasCorrect ? 1 : 0;
      newStats.totalAnswers++;
      newStats.totalSnacks++;

      const today = new Date().toLocaleDateString();
      if (!newStats.daysPlayed.includes(today)) {
        newStats.daysPlayed.push(today);
      }
      (async () => {
        await LocalStorage.setItem("snackStats", JSON.stringify(newStats));
      })();

      return newStats;
    });
  };

  // Submit user's guess
  const submit = (): void => {
    if (!loading.current && !hasGuessed.current) {
      const guessMapping: Record<string, string> = { one: "1", two: "2", three: "3" };
      const parsedGuess = guessMapping[guess.toLowerCase()] || guess.toLowerCase();

      if (["1", "2", "3"].includes(parsedGuess)) {
        let guessText: string;
        if (parsedGuess === "1") {
          guessText = option1.replace(/\*\*/g, "");
        } else if (parsedGuess === "2") {
          guessText = option2.replace(/\*\*/g, "");
        } else {
          guessText = option3.replace(/\*\*/g, "");
        }
        processGuess(parsedGuess, guessText);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `Please enter 1, 2, or 3 to make your guess.`,
        });
      }
    }
  };

  // Update search bar text and highlight selected option
  const updateSearchBar = (text: string): void => {
    if (hasGuessed.current) {
      showToast({
        style: Toast.Style.Failure,
        title: `You have already guessed. Hit enter for the next snack.`,
      });
      return;
    }

    // Make the selected option bold (and unbold all others)
    setOption1((prev) =>
      text === "1" || text.toLowerCase() === "one" ? `**${prev.replace(/\*\*/g, "")}**` : prev.replace(/\*\*/g, ""),
    );

    setOption2((prev) =>
      text === "2" || text.toLowerCase() === "two" ? `**${prev.replace(/\*\*/g, "")}**` : prev.replace(/\*\*/g, ""),
    );

    setOption3((prev) =>
      text === "3" || text.toLowerCase() === "three" ? `**${prev.replace(/\*\*/g, "")}**` : prev.replace(/\*\*/g, ""),
    );

    setGuess(text);
  };

  // Render statistics markdown
  const renderStatistics = (): string => {
    const accuracy = stats.totalAnswers > 0 ? ((stats.correctAnswers / stats.totalAnswers) * 100).toFixed(1) : "0.0";

    return markdownTemplates.statistics
      .replace("{correctAnswers}", stats.correctAnswers.toString())
      .replace("{totalAnswers}", stats.totalAnswers.toString())
      .replace("{accuracy}", accuracy)
      .replace("{daysPlayed}", stats.daysPlayed.length.toString())
      .replace("{totalSnacks}", stats.totalSnacks.toString());
  };

  // Share statistics to clipboard
  const shareStatistics = (): void => {
    const accuracy = stats.totalAnswers > 0 ? ((stats.correctAnswers / stats.totalAnswers) * 100).toFixed(1) : "0.0";

    let statisticsText = markdownTemplates.statistics
      .replace("{correctAnswers}", stats.correctAnswers.toString())
      .replace("{totalAnswers}", stats.totalAnswers.toString())
      .replace("{accuracy}", accuracy)
      .replace("{daysPlayed}", stats.daysPlayed.length.toString())
      .replace("{totalSnacks}", stats.totalSnacks.toString());

    statisticsText = statisticsText.replace(/#/g, "");

    Clipboard.copy(statisticsText);

    showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
    });
  };

  // Share content to clipboard
  const share = (content: string): void => {
    Clipboard.copy(content.replace(/#/g, "").replace(/\n\n/g, "\n"));

    showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
    });
  };

  const changeTopic = (): void => {
    openCommandPreferences();
    refreshTopic.current = true;
  };

  return (
    <List
      isShowingDetail={true}
      onSearchTextChange={updateSearchBar}
      searchText={guess}
      searchBarPlaceholder={hasGuessed.current ? "Hit enter for the next learning snack." : "Enter 1, 2, or 3 here"}
    >
      <List.Item
        title={newSnackTitle}
        icon={Icon.Star}
        id="quiz"
        detail={<List.Item.Detail isLoading={uiLoading} markdown={markdown} />}
        actions={
          <ActionPanel>
            {hasGuessed.current ? (
              <Action icon={Icon.Star} title="Next Snack" onAction={fetchSnack} />
            ) : (
              <Action icon={Icon.QuestionMark} title="Submit Guess" onAction={submit} />
            )}
            <Action icon={Icon.Switch} title="Change Topic" onAction={changeTopic} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Statistics"}
        icon={Icon.Trophy}
        id="stats"
        detail={<List.Item.Detail markdown={renderStatistics()} />}
        actions={
          <ActionPanel>
            <Action icon={Icon.Clipboard} title="Share" onAction={shareStatistics} />
            <Action icon={Icon.Switch} title="Change Topic" onAction={changeTopic} />
          </ActionPanel>
        }
      />
      {pastSnacks.map((item, index) => (
        <List.Item
          key={index}
          title={"Snacked: " + item.title}
          icon={Icon.Dot}
          detail={<List.Item.Detail markdown={item.content} />}
          actions={
            <ActionPanel>
              <Action icon={Icon.Clipboard} title="Share" onAction={() => share(item.content)} />
              <Action icon={Icon.Switch} title="Change Learning Topic" onAction={changeTopic} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
