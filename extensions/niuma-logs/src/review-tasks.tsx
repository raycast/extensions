import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { isAxiosError } from "axios";
import { getApiClient } from "./api";
import { getStrings } from "./i18n";

export default async function ReviewTasks() {
  const strings = getStrings();
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
        description: strings.review.missionDescription,
        repos: [repoSlug],
        visibility: "private",
      },
    };
    await showToast({
      title: strings.toasts.opening,
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
      title: strings.toasts.reviewFailed,
      message:
        error instanceof Error ? error.message : strings.toasts.errorUnknown,
      style: Toast.Style.Failure,
    });
  }
}
