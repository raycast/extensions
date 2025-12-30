import {
  getPreferenceValues,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getApiClient } from "./api";

const HUD_CONTENT = [
  `💪 记录任务成功，开干吧！`,
  `🍊 我在这里等着，您可以先去取橘子`,
  `💾 记录成功，可清理脑部 RAM`,
];

export default async function CreateTask(
  props: LaunchProps<{ arguments: { title: string } }>,
) {
  const { title } = props.arguments;

  const { repo } = getPreferenceValues();
  const client = getApiClient();

  try {
    await showToast({
      title: "记录任务中...",
      message: `🐮 正在记录任务：${title}`,
      style: Toast.Style.Animated,
    });

    await client.Issues.CreateIssue({
      repo,
      post_issue_form: {
        title,
      } as Parameters<typeof client.Issues.CreateIssue>[0]["post_issue_form"],
    });
    await showHUD(HUD_CONTENT[Math.floor(Math.random() * HUD_CONTENT.length)]);
  } catch (error) {
    await showToast({
      title: "记录任务失败...",
      message: error instanceof Error ? error.message : "未知错误",
      style: Toast.Style.Failure,
    });
  }
}
