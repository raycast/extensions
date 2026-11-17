import { closeMainWindow, PopToRootType, showHUD } from "@raycast/api";
import { describeError, leaf } from "./lib/leaf";

// The HUD can't be styled, so its first character says how it went
const done = (text: string) => showHUD(`✅ ${text}`, { popToRootType: PopToRootType.Immediate });
const failed = (text: string) => showHUD(`❌ ${text}`, { popToRootType: PopToRootType.Immediate });

/** Joins the meeting Leaf Calendar's join shortcut would pick; Leaf Calendar opens the link itself. */
export default async function JoinNextMeeting() {
  // Raycast Closes Right Away; The HUD Says What Happened
  await closeMainWindow({ clearRootSearch: true });

  try {
    const { id, opened } = await leaf().call("meetings.join", {});
    if (!opened) {
      await failed("Windows couldn't open the meeting link");
      return;
    }

    // The Meeting's Title For The HUD, When Leaf Calendar Can Name It
    const title = await leaf()
      .call("events.get", { id })
      .then((event) => event.title)
      .catch(() => "");
    await done(title ? `Joining ${title}` : "Joining your meeting");
  } catch (error) {
    await failed(describeError(error).title);
  } finally {
    leaf().close();
  }
}
