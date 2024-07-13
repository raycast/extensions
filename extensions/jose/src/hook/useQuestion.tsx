import { getSelectedText, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionHookType } from "../type/chat";

export function useQuestion(props: { initialQuestion: string; disableAutoLoad?: boolean }): QuestionHookType {
  const { initialQuestion, disableAutoLoad } = props;
  const [data, setData] = useState<string>(initialQuestion);
  const [isLoading, setLoading] = useState<boolean>(false);

  // eslint-disable-next-line no-constant-condition
  if (false) {
    useEffect(() => {
      (async () => {
        if (!disableAutoLoad) {
          setLoading(true);
          try {
            const selectedText = await getSelectedText();
            if (selectedText.length > 1) {
              setData(selectedText.trim());
              await showToast({
                style: Toast.Style.Success,
                title: "Selected text loaded!",
              });
            } else {
              await showToast({
                style: Toast.Style.Success,
                title: "No text selected!",
              });
            }
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Selected text couldn't load",
              message: String(error),
            });
          }
          setLoading(false);
        }
      })();
    }, []);
  }

  const update = useCallback(
    async (question: string) => {
      setData(question);
    },
    [setData, data]
  );

  return useMemo(() => ({ data, isLoading, update }), [data, isLoading, update]);
}
