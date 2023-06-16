import { Detail } from "@raycast/api";
import dayjs from "dayjs";
import { useEffect } from "react";
import { History, useAI } from "../hooks";
import { formatContent } from "../utils";

interface ShowDtailProps {
  histories: History[];
  handleSetHistories: (histories: History[]) => void;
  prompt: string;
  date: number;
}

export function ShowDtail(props: ShowDtailProps) {
  const { histories, handleSetHistories, prompt, date } = props;

  const searchPromptIdx = histories.findIndex((history) => history.prompt === prompt && history.date === date);
  if (searchPromptIdx !== -1) {
    return <Detail markdown={formatContent(histories.slice(searchPromptIdx, histories.length))} />;
  }

  const { content, isLoading } = useAI(prompt);

  useEffect(() => {
    return () => {
      // When the generation process is cancelled,
      // save any content that was generated up to that point
      const completeHistory = {
        date: dayjs().valueOf(),
        prompt: prompt,
        content,
      };

      handleSetHistories([completeHistory, ...(histories ?? []).filter((histories) => histories.content)]);
    };
  }, [content]);

  if (!isLoading) {
    const completeHistory = {
      date: dayjs().valueOf(),
      prompt: prompt,
      content,
    };
    handleSetHistories([completeHistory, ...(histories ?? []).filter((histories) => histories.content)]);
  }

  return <Detail isLoading={isLoading} markdown={content} />;
}
