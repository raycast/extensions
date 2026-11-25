import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureHUD } from "./lib/feedback";
import { hex } from "./lib/hex";
import { flipSending, ROUTING_KEY } from "./lib/routing";
import { DoneReply, SettingsReply } from "./lib/types";

export default async function Command() {
  await closeMainWindow();
  try {
    const reply = await hex<SettingsReply>(["settings", "get", ROUTING_KEY]);
    const next = flipSending(reply.settings.find((setting) => setting.key === ROUTING_KEY)?.value);
    if (!next) {
      await showHUD("Update Hex to change annotation sending");
      return;
    }
    await hex<DoneReply>(["settings", "apply", "-"], {
      input: JSON.stringify({ [ROUTING_KEY]: next }),
    });
    await showHUD(
      next.sendCaptures ? "Hex now sends annotations to OpenCode" : "Hex now only saves and copies annotations",
    );
  } catch (error) {
    await showFailureHUD(error);
  }
}
