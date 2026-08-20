import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { joinCall, listRooms } from "./lib/tuple";
import { primaryPersonalRoom } from "./lib/types";

export default async function JoinPersonalRoom() {
  try {
    const personalRooms = await listRooms("--kind", "personal", "--limit", "-1");
    const room = primaryPersonalRoom(personalRooms) ?? personalRooms[0];

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
