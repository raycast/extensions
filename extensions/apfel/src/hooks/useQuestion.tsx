import { useCallback, useMemo, useState } from "react";
import type { QuestionHook } from "../type";

export function useQuestion(props: { initialQuestion: string }): Omit<QuestionHook, "isLoading"> {
  const { initialQuestion } = props;

  const [data, setData] = useState<string>(initialQuestion);

  const update = useCallback(
    async (question: string) => {
      setData(question);
    },
    [setData, data],
  );

  return useMemo(() => ({ data, update }), [data, update]);
}
