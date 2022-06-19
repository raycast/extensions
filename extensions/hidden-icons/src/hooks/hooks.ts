import { useCallback, useEffect, useState } from "react";
import { getRandomFindOutIcon } from "../utils/find-icons-utils";
import { clearInterval } from "timers";
import { Alert, confirmAlert, Icon } from "@raycast/api";

export const GenerateFindOutIcons = (
  isGaming: boolean,
  difficultyMode: string,
  lastRandomRow: number,
  refreshIcon: number
) => {
  const [findOutIcons, setFindOutIcons] = useState<string[]>([]);
  const [targetIcon, setTargetIcon] = useState<string>("");
  const [targetIndex, setTargetIndex] = useState<number>(-1);

  const fetchData = useCallback(async () => {
    if (isGaming) {
      const { targetIcon, targetIndex, randomFindOutIcons } = getRandomFindOutIcon(lastRandomRow, difficultyMode);
      setFindOutIcons(randomFindOutIcons);
      setTargetIcon(targetIcon);
      setTargetIndex(targetIndex);
    }
  }, [isGaming, difficultyMode, lastRandomRow, refreshIcon]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { findOutIcons: findOutIcons, targetIcon: targetIcon, targetIndex: targetIndex };
};

export const startGame = (allCountDownTime: number) => {
  const [leftTime, setLeftTime] = useState<number>(allCountDownTime);
  const [showScore, setShowScore] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isGaming, setIsGaming] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (isGaming) {
      let countDown = Number(allCountDownTime);
      const interval = setInterval(() => {
        countDown -= 1;
        setLeftTime(countDown);
        if (countDown === 0) {
          setShowScore(!showScore);
          setLeftTime(allCountDownTime);
          setIsGaming(false);
          clearInterval(interval);
        }
      }, 1000);
      setScore(0);
    }
  }, [isGaming]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    leftTime: leftTime,
    score: score,
    showScore: showScore,
    setScore: setScore,
    isGaming: isGaming,
    setIsGaming: setIsGaming,
  };
};

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
};
