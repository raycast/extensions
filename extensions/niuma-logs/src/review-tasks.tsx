import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { isAxiosError } from "axios";
import { getApiClient } from "./api";

const missionDescription = "Niuma Logs Review View";
const openingToast = "Opening...";
const reviewFailedToast = "Failed to open review...";
const errorUnknownToast = "Unknown error";

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
        description: missionDescription,
        repos: [repoSlug],
        visibility: "private",
      },
    };
    await showToast({
      title: openingToast,
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
      title: reviewFailedToast,
      message: error instanceof Error ? error.message : errorUnknownToast,
      style: Toast.Style.Failure,
    });
  }
}
