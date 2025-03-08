import { showToast, Toast } from "@raycast/api";

export default async function main() {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  await showToast({
    style: Toast.Style.Success,
    title: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    message: `${timezone}`,
  });
}
