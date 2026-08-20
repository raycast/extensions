import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { joinCall, listRooms } from "./lib/tuple";
import { primaryPersonalRoom } from "./lib/types";

export default async function JoinPersonalRoom() {
  try {
    const room = primaryPersonalRoom(await listRooms("--kind", "personal", "--limit", "-1"));

    if (!room) {
      await showHUD("No personal room found");
      return;
    }

    await joinCall(room.slug);
    await showHUD("Joining your personal room");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Join Personal Room" });
  }
}
