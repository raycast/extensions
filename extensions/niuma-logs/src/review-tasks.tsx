import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { isAxiosError } from "axios";
import { getApiClient } from "./api";

export default async function ReviewTasks() {
  const { repo: repoSlug, gitDomain } = getPreferenceValues();
  const client = getApiClient();

  const [group, ...subSlug] = repoSlug.split("/");

  const missionGroup = group;
  const missionSubSlug = subSlug.join("/") + "-view";
  const missionUrl = `${gitDomain}/${missionGroup}/${missionSubSlug}`;

  try {
    const body: Parameters<typeof client.Missions.CreateMission>[0] = {
      group: missionGroup,
      request: {
        name: missionSubSlug,
        description: "【牛马绘】任务回顾视图",
        repos: [repoSlug],
        visibility: "private",
      },
    };
    await showToast({
      title: "正在打开...",
      style: Toast.Style.Animated,
    });

    await client.Missions.CreateMission(body);

    return await open(missionUrl);
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 409) {
        return await open(missionUrl);
      }
    }

    await showToast({
      title: "回顾任务失败...",
      message: error instanceof Error ? error.message : "未知错误",
      style: Toast.Style.Failure,
    });
  }
}
