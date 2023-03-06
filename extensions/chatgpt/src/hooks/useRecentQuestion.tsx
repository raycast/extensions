import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Question, RecentQuestionHook } from "../type";

export function useRecentQuestion(): RecentQuestionHook {
  const [data, setData] = useState<Question[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedRecentQuestions = await LocalStorage.getItem<string>("recentQuestions");

      if (!storedRecentQuestions) {
        setData([]);
      } else {
        setData([...JSON.parse(storedRecentQuestions)]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("recentQuestions", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (question: Question) => {
      setData([...data, question]);
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing recent questions...",
      style: Toast.Style.Animated,
    });
    setData([]);
    toast.title = "Recent questions cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return { data, isLoading, add, clear };
}
