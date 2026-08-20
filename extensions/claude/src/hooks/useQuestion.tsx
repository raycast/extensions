import { Clipboard, getPreferenceValues, getSelectedText, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuestionHook } from "../type";

export function useQuestion(props: { initialQuestion: string; disableAutoLoad?: boolean }): QuestionHook {
  const { initialQuestion, disableAutoLoad } = props;
  const [data, setData] = useState<string>(initialQuestion);
  const [isLoading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      // Read fresh inside the effect rather than captured once in a `useState`
      // initializer, matching the same mount-capture normalization applied to
      // `isAutoFullInput` in `src/ask.tsx` and `useStream` in `src/hooks/useChat.tsx`.
      // Inert today (this effect is mount-only, so the captured and fresh reads agree),
      // but the captured shape is the one that bites when someone adds a dependency —
      // and it is the shape people copy.
      const isAutoLoad = getPreferenceValues<Preferences>().isAutoLoad;
      if (isAutoLoad && !disableAutoLoad) {
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Couldn't load selected text",
            message: errorMessage,
            primaryAction: {
              title: "Copy Error",
              onAction: async () => {
                await Clipboard.copy(errorMessage);
              },
            },
          });
        }
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback(
    async (question: string) => {
      setData(question);
    },
    [setData],
  );

  return useMemo(() => ({ data, isLoading, update }), [data, isLoading, update]);
}
