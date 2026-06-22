import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import { runPosAction } from "./pos";
import { isDestructive, splitArgs, type PosCommand } from "./palette";

/** Run a pos action with a progress → success/failure toast. */
export async function toastRun(
  args: string[],
  successTitle: string,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `pos ${args.join(" ")}`,
  });
  try {
    const out = await runPosAction(args);
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    if (out) toast.message = out.split("\n").slice(-1)[0];
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "pos command failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

/** Confirm, then `pos load <target> --apply` (closes the other workspaces). */
export async function confirmAndLoad(target: string): Promise<void> {
  const ok = await confirmAlert({
    title: `Load ${target}?`,
    message:
      "Opens and pins its members, and closes the rest (running jobs and scratch are kept).",
    primaryAction: { title: "Load", style: Alert.ActionStyle.Destructive },
  });
  if (ok) await toastRun(["load", target, "--apply"], `Loaded ${target}`);
}

/** Run a registry command with raw arg text; confirms first when destructive. */
export async function runRegistryCommand(
  cmd: PosCommand,
  rawArgs: string,
): Promise<void> {
  const args = [cmd.name, ...splitArgs(rawArgs)];
  if (isDestructive(cmd.name)) {
    const ok = await confirmAlert({
      title: `Run pos ${args.join(" ")}?`,
      message: "This can close or destroy live workspaces.",
      primaryAction: { title: "Run", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
  }
  await toastRun(args, `Ran pos ${cmd.name}`);
}
