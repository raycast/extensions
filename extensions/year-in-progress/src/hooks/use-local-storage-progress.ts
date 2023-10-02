import { useEffect, useState } from "react";
import { Progress, defaultProgress } from "../utils/progress";
import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "xProgress";

type State = { isLoading: boolean; allProgress: Progress[]; currMenubarProgressKey: string };

export function useLocalStorageProgress(): [State, React.Dispatch<React.SetStateAction<State>>, () => Promise<State>] {
  const [state, setState] = useState<State>({
    isLoading: true,
    allProgress: defaultProgress,
    currMenubarProgressKey: defaultProgress[0].key,
  });

  useEffect(() => {
    (async () => {
      const storedAllProgress = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!storedAllProgress) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: defaultProgress,
          currMenubarProgressKey: defaultProgress[0].key,
        }));
        return;
      }

      try {
        const xProgress: Omit<State, "isLoading"> = JSON.parse(storedAllProgress);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: xProgress.allProgress,
          currMenubarProgressKey: xProgress.currMenubarProgressKey,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          allProgress: defaultProgress,
          currMenubarProgressKey: defaultProgress[0].key,
        }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ allProgress: state.allProgress, currMenubarProgressKey: state.currMenubarProgressKey })
    );
  }, [state.allProgress, state.currMenubarProgressKey]);

  const getLatestState = async () => {
    const storedAllProgress = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!storedAllProgress) {
      return storedAllProgress;
    }
    return JSON.parse(storedAllProgress);
  };

  return [state, setState, getLatestState];
}
