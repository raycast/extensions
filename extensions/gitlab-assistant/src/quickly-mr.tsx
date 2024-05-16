import { Clipboard, PopToRootType, showHUD } from "@raycast/api";
import { createMr, getUserEvent } from "./utils/api";

const getYesterdayDate = () => {
  const currentDate = new Date();
  const yesterdayDate = new Date(currentDate);
  yesterdayDate.setDate(currentDate.getDate() - 1);
  const formattedYesterday = yesterdayDate.toISOString().split("T")[0];
  return formattedYesterday;
};

export default async function Command() {
  const eventParams = {
    action: "pushed",
    after: getYesterdayDate(),
    per_page: 10,
  };
  const userEventData = await getUserEvent(eventParams);
  const firstPushEvent = userEventData.find((event: { action_name: string }) =>
    ["pushed to", "pushed new"].includes(event?.action_name),
  );

  if (firstPushEvent) {
    const { push_data, project_id } = firstPushEvent;
    const { commit_title, ref } = push_data;
    const data = await createMr({
      id: project_id,
      data: {
        source_branch: ref,
        target_branch: "dev",
        title: commit_title,
      },
    });
    await Clipboard.copy(data.web_url);
    showHUD("Merge request created successfully 🎉", { popToRootType: PopToRootType.Immediate });
  } else {
    showHUD("Failed 🥵 : No push event found today!", { popToRootType: PopToRootType.Immediate });
  }
}
