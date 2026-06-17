import { showToast, Toast } from "@raycast/api";
import * as wip from "./oauth/wip";

export default async function Command() {
  await wip.authorize();
  const user = await wip.fetchUser();
  showToast({ title: "Signed in as @" + user?.username || "unknown", style: Toast.Style.Success });
}
