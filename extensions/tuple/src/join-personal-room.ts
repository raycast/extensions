import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { joinRoom, listRooms } from "./lib/tuple";
import { primaryPersonalRoom } from "./lib/types";

export default async function JoinPersonalRoom() {
  try {
    const personalRooms = await listRooms("--kind", "personal", "--limit", "-1");
    const room = primaryPersonalRoom(personalRooms);

    if (!room) {
      await showHUD(
        personalRooms.length === 0 ? "No personal room found" : "Update Tuple to identify your primary room",
      );
      return;
    }

    if (!(await joinRoom(room.slug))) return;
    await showHUD("Joining your personal room");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Join Personal Room" });
  }
}
