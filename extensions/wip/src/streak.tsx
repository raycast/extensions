import { updateCommandMetadata, showToast, Toast, environment } from "@raycast/api";
import * as wip from "./oauth/wip";

export default async function Command() {
  await wip.authorize();
  const data = await wip.fetchStreak();

  await updateCommandMetadata({
    subtitle: `${data.streak} 🔥 – ${data.streaking ? "Your streak is safe" : "⚠️ No completed todos today!"}`,
  });

  if (environment.launchType === "userInitiated") {
    await showToast({
      style: Toast.Style.Success,
      title: "Never lose your streak",
      message: "Pin this command with ⇧⌘F",
    });
  }
}
