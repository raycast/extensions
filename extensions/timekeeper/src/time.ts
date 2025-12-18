import { showToast, Toast, closeMainWindow } from "@raycast/api";

export default async function CurrentTime() {
  const now = new Date();

  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const timezoneName = Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;

  await closeMainWindow();
  await showToast({
    style: Toast.Style.Success,
    title: `${timeString} (${timezoneName})`,
  });
}
