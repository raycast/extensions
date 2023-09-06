import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionHook } from "../type";
import { Toast, getSelectedText, showToast, getPreferenceValues } from "@raycast/api";

export function useQuestion(props: { initialQuestion: string; disableAutoLoad?: boolean }): QuestionHook {
  const { initialQuestion, disableAutoLoad } = props;
  const [data, setData] = useState<string>(initialQuestion);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isAutoLoadText] = useState<boolean>(() => {
    return getPreferenceValues<{
      isAutoLoadText: boolean;
    }>().isAutoLoadText;
  });

  useEffect(() => {
    if (initialQuestion) {
      return;
    }
    (async () => {
      if (isAutoLoadText && !disableAutoLoad) {
        setLoading(true);
        try {
          const selectedText = await getSelectedText();
          if (selectedText.length > 1) {
            setData(selectedText.trim());
            await showToast({
              style: Toast.Style.Success,
              title: "Selected text loaded!",
            });
          }
        } catch (error) {
          console.log(error);
        }
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback(
    async (question: string) => {
      setData(question);
    },
    [setData, data]
  );

  return useMemo(
    () => ({
      data,
      isLoading,
      update,
    }),
    [data, isLoading, update]
  );
}
