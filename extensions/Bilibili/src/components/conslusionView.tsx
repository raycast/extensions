import { Detail, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCid, getConclsion } from "../apis";

type Props = { bvid: string; cid: number; up_mid: number };
export function ConclusionView(props: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [conclusionResult, setConclusionResult] = useState<Bilibili.VideoConclusionResponseData>();
  const [emptyTitle, setEmptyTitle] = useState("当前视频暂不支持 AI 视频总结");

  function getConclusionUnavailableTitle(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("无字幕") ||
      lowerMessage.includes("暂无字幕") ||
      lowerMessage.includes("字幕") ||
      lowerMessage.includes("subtitle") ||
      lowerMessage.includes("caption")
    ) {
      return "该视频暂无字幕，暂时无法生成 AI 总结";
    }

    return "当前视频暂不支持 AI 视频总结";
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resolvedCid = props.cid || (await getCid(props.bvid)).cid;
        const result = await getConclsion(props.bvid, resolvedCid, props.up_mid);
        if (!cancelled) {
          if (!result) {
            setConclusionResult(undefined);
            setEmptyTitle("该视频暂无字幕，无法生成 AI 总结");
            return;
          }

          setConclusionResult(result);
          setEmptyTitle("当前视频暂不支持 AI 视频总结");
        }
      } catch (error) {
        if (!cancelled) {
          setEmptyTitle(getConclusionUnavailableTitle(error));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.bvid, props.cid, props.up_mid]);

  function formatTimestamp(timestamp: number) {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const seconds = timestamp % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function generateMarkdown(conclusion: Bilibili.VideoConclusionResponseData) {
    const summary = `### ${conclusion.model_result.summary}`;

    const content = conclusion.model_result.outline
      .map((outline) => {
        const outlineSummary = `\n*${outline.title}*\n`;
        const outlineContent = outline.part_outline
          .map((partOutline) => {
            const videoUrl = `https://www.bilibili.com/video/${props.bvid}?t=${partOutline.timestamp}`;

            return `- [${formatTimestamp(partOutline.timestamp)}](${videoUrl}) ${partOutline.content}\n`;
          })
          .join("\n");

        return [outlineSummary, outlineContent];
      })
      .flat()
      .join("\n");

    return `${summary}\n${content}`;
  }

  return conclusionResult?.code === -1 || !conclusionResult?.model_result.outline?.length ? (
    <List isLoading={isLoading}>
      <List.EmptyView icon={"🤖"} title={emptyTitle} />
    </List>
  ) : (
    <Detail isLoading={isLoading} markdown={conclusionResult && generateMarkdown(conclusionResult)} />
  );
}
