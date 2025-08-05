import { Detail, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCid, getConclsion } from "../apis";

type Props = { bvid: string; cid: number; up_mid: number };
export function ConclusionView(props: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [conclusionResult, setConclusionResult] = useState<Bilibili.VideoConclusionResponseData>();

  useEffect(() => {
    (async () => {
      try {
        if (!props.cid) {
          const cidResult = await getCid(props.bvid);
          props.cid = cidResult.cid;
        }
        const result = await getConclsion(props.bvid, props.cid, props.up_mid);
        setConclusionResult(result);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Get AI summary failed");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [props]);

  function generateMarkdown(conclusion: Bilibili.VideoConclusionResponseData) {
    const summary = `### ${conclusion.model_result.summary}`;

    const content = conclusion.model_result.outline
      .map((outline) => {
        const outlineSummary = `\n*${outline.title}*\n`;
        const outlineContent = outline.part_outline
          .map((partOutline) => {
            const videoUrl = `https://www.bilibili.com/video/${props.bvid}?t=${[partOutline.timestamp]}`;
            const hours = Math.round(partOutline.timestamp / (60 * 60));
            const minutes = Math.round(partOutline.timestamp / 60);
            const seconds = partOutline.timestamp % 60;

            return `- [${hours === 0 ? "" : `${hours}:`}${minutes}:${seconds}](${videoUrl}) ${partOutline.content}\n`;
          })
          .join("\n");

        return [outlineSummary, outlineContent];
      })
      .flat()
      .join("\n");

    return `${summary}\n${content}`;
  }

  return conclusionResult?.code === -1 || !conclusionResult?.model_result.outline ? (
    <List isLoading={isLoading}>
      <List.EmptyView icon={"🤖"} title="当前视频暂不支持 AI 视频总结" />
    </List>
  ) : (
    <Detail isLoading={isLoading} markdown={conclusionResult && generateMarkdown(conclusionResult)} />
  );
}
