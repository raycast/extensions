import { DrawChat, DrawHook, DrawQuestionOpsSize } from "../type";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChatGo } from "./useChatGo";
import { clearSearchBar, showToast, Toast } from "@raycast/api";

export function useDraw(): DrawHook {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<DrawChat[]>([]);

  const chatGo = useChatGo();

  const ask = async (question: string, n = 2, size: DrawQuestionOpsSize = "512x512") => {
    await clearSearchBar();
    setLoading(true);
    const toast = await showToast({
      title: "Getting your answer...",
      style: Toast.Style.Animated,
    });

    chatGo.getImages({ prompt: question, n, size }).then((response) => {
      if (response?.data.code === "000000") {
        const drawChat: DrawChat = {
          id: uuidv4(),
          question,
          answer: response?.data.data.urls ?? [],
          created_at: new Date().toISOString(),
          n: 2,
          size: "512x512",
        };
        setData((prev) => {
          return [...prev, drawChat];
        });
        setLoading(false);
        toast.title = "Got your images!";
        toast.style = Toast.Style.Success;
      } else {
        setLoading(false);
        toast.title = response?.data.msg || "Got your images error!";
        toast.style = Toast.Style.Failure;
      }
    });
  };

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, ask, clear }),
    [data, setData, isLoading, setLoading, ask, clear]
  );
}
