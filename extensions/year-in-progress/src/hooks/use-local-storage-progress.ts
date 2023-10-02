import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { Progress } from "../types";
import { defaultProgress, getProgressNumByDate, getQuarterProgressNum, getYearProgressNum } from "../utils/progress";

const STORAGE_KEY = "xProgress";

type State = { isLoading: boolean; allProgress: Progress[]; currMenubarProgressTitle: string };

function getLatestProgressNum(progress: Progress) {
  if (progress.title === "Year In Progress") {
    return getYearProgressNum();
  }
  if (progress.title === "Quarter In Progress") {
    return getQuarterProgressNum();
  }
  return getProgressNumByDate(new Date(progress.startDate), new Date(progress.endDate));
}

export function useLocalStorageProgress(): [
  State,
  React.Dispatch<React.SetStateAction<State>>,
  () => Promise<Omit<State, "isLoading">>
] {
  const [state, setState] = useState<State>({
    isLoading: true,
    allProgress: defaultProgress,
    currMenubarProgressTitle: defaultProgress[0].title,
  });

  useEffect(() => {
    (async () => {
      const storedAllProgress = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!storedAllProgress) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: defaultProgress,
          currMenubarProgressTitle: defaultProgress[0].title,
        }));
        return;
      }

      try {
        const xProgress: Omit<State, "isLoading"> = JSON.parse(storedAllProgress);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: xProgress.allProgress.map((progress) => ({
            ...progress,
            // Re-calulate progress when accessing it
            progressNum: getLatestProgressNum(progress),
          })),
          currMenubarProgressTitle: xProgress.currMenubarProgressTitle,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: defaultProgress,
          currMenubarProgressTitle: defaultProgress[0].title,
        }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ allProgress: state.allProgress, currMenubarProgressTitle: state.currMenubarProgressTitle })
    );
  }, [state.allProgress, state.currMenubarProgressTitle]);

  const getLatestXProgress = async () => {
    const storedAllProgress = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!storedAllProgress) {
      return { allProgress: defaultProgress, currMenubarProgressTitle: defaultProgress[0].title };
    }

    try {
      const xProgress: Omit<State, "isLoading"> = JSON.parse(storedAllProgress);
      return {
        ...xProgress,
        allProgress: xProgress.allProgress.map((progress) => ({
          ...progress,
          // Re-calulate progress when accessing it
          progressNum: getLatestProgressNum(progress),
        })),
      };
    } catch (err) {
      return {
        allProgress: defaultProgress,
        currMenubarProgressTitle: defaultProgress[0].title,
      };
    }
  };

  return [state, setState, getLatestXProgress];
}
