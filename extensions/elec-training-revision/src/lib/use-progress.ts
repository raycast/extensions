import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { emptyProgress, parseProgress, Progress, recordAnswer } from "./progress";
import { Question } from "../data/questions";

const key = "revision-progress-v1";

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setProgress(parseProgress(await LocalStorage.getItem<string>(key)));
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read saved progress.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function saveAnswer(question: Question, selected: number) {
    try {
      const latest = parseProgress(await LocalStorage.getItem<string>(key));
      const next = recordAnswer(latest, question, selected);
      await LocalStorage.setItem(key, JSON.stringify(next));
      setProgress(next);
      return true;
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Answer was not saved",
        message: cause instanceof Error ? cause.message : "Please try again.",
      });
      return false;
    }
  }

  async function reset() {
    try {
      await LocalStorage.removeItem(key);
      setProgress(emptyProgress());
      setError(undefined);
      await showToast({ style: Toast.Style.Success, title: "Revision progress reset" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not reset progress" });
    }
  }

  return { progress, loading, error, reload, saveAnswer, reset };
}
