import { LaunchType, LocalStorage, launchCommand } from "@raycast/api";
import { useEffect, useState } from "react";
import { Progress } from "../types";
import { defaultProgress, getProgressNumByDate } from "../utils/progress";

const STORAGE_KEY = "xProgress";

type State = { isLoading: boolean; allProgress: Progress[]; currMenubarProgressTitle: string };

function getLatestAllProgress(allProgress: Progress[]) {
  const latestDefaultProgress = defaultProgress.map((progress) => {
    const updatedProgress = allProgress
      .filter((progress) => progress.type === "default")
      .find((p) => p.title === progress.title);
    return {
      ...progress,
      pinned: updatedProgress?.pinned,
      menubar: {
        shown: updatedProgress?.menubar.shown,
        title: progress.menubar.title,
      },
      showAsCommand: updatedProgress?.showAsCommand,
    };
  });
  const userProgress = allProgress
    .filter((progress) => progress.type === "user")
    .map((progress) => ({
      ...progress,
      progressNum: getProgressNumByDate(new Date(progress.startDate), new Date(progress.endDate)),
    }));
  return [...latestDefaultProgress, ...userProgress];
}

export const getLatestXProgress = async () => {
  const storedAllProgress = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!storedAllProgress) {
    return { allProgress: defaultProgress, currMenubarProgressTitle: defaultProgress[0].title };
  }

  try {
    const xProgress: Omit<State, "isLoading"> = JSON.parse(storedAllProgress);
    return {
      ...xProgress,
      allProgress: getLatestAllProgress(xProgress.allProgress),
    };
  } catch (err) {
    return {
      allProgress: defaultProgress,
      currMenubarProgressTitle: defaultProgress[0].title,
    };
  }
};

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
        // setting first progress as default command subtitle
        defaultProgress[0].showAsCommand = true;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: defaultProgress,
          currMenubarProgressTitle: defaultProgress[0].title,
        }));
        await launchCommand({ name: "year-in-progress", type: LaunchType.Background });
        return;
      }

      try {
        const xProgress: Omit<State, "isLoading"> = JSON.parse(storedAllProgress);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: getLatestAllProgress(xProgress.allProgress),
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

  return [state, setState, getLatestXProgress];
}
