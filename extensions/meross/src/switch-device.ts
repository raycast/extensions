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
      // Only query devices whose name could match, so a hotkey doesn't wait for every plug.
      const targets = await session.targets((def) => {
        const name = def.devName.toLowerCase();
        return q.includes(name) || name.includes(q);
      });
      const target = findTarget(targets, query);
      if (!target) throw new Error(`No Meross device named "${query}"`);
      if (!target.online) throw new Error(`${target.title} is offline`);
      if (target.mode === "unsupported") throw new Error(`${target.title} cannot be switched`);

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
