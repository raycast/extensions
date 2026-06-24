import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRooms, joinCall } from "./lib/tuple";

export default async function JoinPersonalRoom() {
  try {
    const { personal } = await getRooms();
    const latest = [...(personal ?? [])].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )[0];

    if (!latest) {
      await showHUD("No personal room found");
      return;
    }

    await joinCall(latest.slug);
    await showHUD("Joining your personal room");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Join Personal Room" });
  }
}
