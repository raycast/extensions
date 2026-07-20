import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { joinCall, listRooms } from "./lib/tuple";

export default async function JoinPersonalRoom() {
  try {
    // `tuple rooms list --kind personal` returns the user's personal room(s) — almost always
    // exactly one. The CLI orders rooms by occupied, then favorited, then name, so [0] is the
    // highest-priority personal room (and, in the common single-room case, the only one).
    const [room] = await listRooms("--kind", "personal");

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
