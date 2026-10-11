import { type LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { findTarget, MfaRequiredError, withSession } from "./lib/meross";

type Action = "toggle" | "on" | "off";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SwitchDevice }>) {
  const query = props.arguments.device.trim();
  const action = (props.arguments.action || "toggle") as Action;
  const q = query.toLowerCase();

  try {
    const message = await withSession(async (session) => {
      // Only query devices whose name could match (outlet titles start with the device name),
      // so a hotkey doesn't wait for every plug.
      const targets = await session.targets((def) => q.startsWith(def.devName.toLowerCase()));
      const target = findTarget(targets, query);
      if (!target) throw new Error(`No Meross device named "${query}"`);
      if (!target.online) throw new Error(`${target.title} is offline`);
      if (target.mode === "unsupported") throw new Error(`${target.title} cannot be switched`);

      if (action === "toggle" && target.on === undefined) {
        throw new Error(`Could not read the state of ${target.title}; use the "On" or "Off" action instead`);
      }
      const on = action === "toggle" ? !target.on : action === "on";
      await session.setPower(target, on);
      return `${target.title} ${on ? "on" : "off"}`;
    });
    await showHUD(message);
  } catch (error) {
    await showFailureToast(error, {
      title:
        error instanceof MfaRequiredError
          ? "Meross login needs an MFA code – open “Search Devices” to log in"
          : "Could not switch Meross device",
    });
  }
}
