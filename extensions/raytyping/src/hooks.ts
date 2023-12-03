import { useEffect, useState } from "react";
import { calculateWPM, generateMatchingWords, generateNewTest, generateSuccessMessage } from "./utils";

export function useGame() {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [test, setTest] = useState("");

  // Speed has been counted by word per minutes (wpm)
  const [speed, setSpeed] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean>(true);

  const [typedText, setTypedText] = useState<string>("");
  const [content, setContent] = useState<string>(test);

  const [isFinish, setIsFinish] = useState<boolean>(false);
  const [inProgress, setInProgress] = useState<boolean>(false);

  function reloadGame() {
    setTypedText("");
    setSpeed(0);
    setStartTime(null);
    setFailedCount(0);

    // Generate new test
    const test = generateNewTest();

    setTest(test);
    setContent(test);

    setInProgress(false);
    setIsFinish(false);
  }

  useEffect(() => {
    reloadGame();
  }, []);

  useEffect(() => {
    // If game is finished the we dont want to process anything
    if (isFinish || typedText.length === 0) {
      return;
    }

    if (!inProgress) {
      setInProgress(true);
    }

    let beginning: Date | null = null;

    if (!startTime) {
      beginning = new Date();
      setStartTime(beginning);
    } else {
      beginning = startTime;
    }

    const [matchingWords, matchedCount] = generateMatchingWords(typedText, test, () => {
      setFailedCount(failedCount + 1);
    });

    if (matchedCount === test.length) {
      setIsFinish(true);
      setInProgress(false);
      setContent(generateSuccessMessage());
      return;
    }

    setIsCorrect(matchedCount === typedText.length);
    setContent(matchingWords);

    setSpeed(calculateWPM(beginning, typedText));
  }, [typedText]);

  return {
    content: content,
    isFinish: isFinish,
    isCorrect: isCorrect,
    speed: speed,
    failedCount: failedCount,
    reloadGame: reloadGame,
    typedText: typedText,
    setTypedText: setTypedText,
    inProgress: inProgress,
    test: test,
  };
}
