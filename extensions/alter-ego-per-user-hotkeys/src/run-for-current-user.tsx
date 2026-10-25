import { launchCommand, LaunchProps, LaunchType, open, showHUD } from "@raycast/api";
import { homedir, userInfo } from "node:os";
import { lookupTarget } from "./lib/lookup";
import { decodePayload } from "./lib/payload";
import { HandoffContext, Target } from "./lib/types";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RunForCurrentUser }>) {
  const decoded = decodePayload(props.arguments.map);

  if (!decoded.ok) {
    // The Quicklink's own argument is unreadable (not the clipboard) — Manage
    // still needs to fall through its normal clipboard/empty-state resolution
    // rather than silently discarding anything (spec §7).
    await showHUD("⚠️ Alter Ego: don't run this directly — use your Quicklink. Opening Manage…");
    await launchManage({ source: "decode-error" });
    return;
  }

  const username = getCurrentUsername();
  const target = lookupTarget(decoded.payload.map, username);

  if (!target) {
    await launchManage({ payload: decoded.payload, source: "hotkey" });
    return;
  }

  try {
    await open(resolveOpenValue(target));
  } catch {
    await showHUD(`⚠️ Alter Ego: couldn't open "${target.value}"`);
  }
}

async function launchManage(context: HandoffContext): Promise<void> {
  try {
    await launchCommand({ name: "manage-alter-ego", type: LaunchType.UserInitiated, context });
  } catch {
    await showHUD("⚠️ Alter Ego: couldn't open Manage Alter Ego — is the command enabled?");
  }
}

function getCurrentUsername(): string | undefined {
  try {
    return userInfo().username || process.env.USER;
  } catch {
    return process.env.USER;
  }
}

function resolveOpenValue(target: Target): string {
  // open() does not reliably do shell-style tilde expansion for path targets.
  if (target.type === "path" && target.value.startsWith("~")) {
    return homedir() + target.value.slice(1);
  }
  return target.value;
}
