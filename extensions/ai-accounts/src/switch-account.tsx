import { launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { sanitize } from "./lib/exec";
import { ensureFinalRecord, isSwitchRequest, performSwitch } from "./lib/flow";
import { SwitchRequest, SwitchResult } from "./lib/model";
import { switchReport } from "./lib/switchReport";
import {
  buildDeps,
  codexHandoffFor,
  getConfig,
  handOffToCodexBar,
  refreshMenuBar,
  runAfterSwitchCommand,
} from "./raycast/runtime";

// No-view worker for every switch (list, menu bar, suggestions). It only accepts a validated
// SwitchRequest; executable paths always come from preferences.

async function report(req: SwitchRequest, result: SwitchResult): Promise<void> {
  // A switch started in the list (a row or one of its suggestions) is reported by the list, which follows the
  // request through its operation record. showHUD would close the Raycast window, which by now may show the list
  // or another command, and Raycast refuses toasts from background launches such as this worker.
  if (req.via === "list") return;
  await showHUD(switchReport(req, result).hud);
}

export default async function Command(props: LaunchProps<{ launchContext?: SwitchRequest }>) {
  const ctx: unknown = props.launchContext;
  if (!isSwitchRequest(ctx)) {
    try {
      await launchCommand({ name: "accounts", type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: "Could not open AI Accounts" });
    }
    return;
  }
  const cfg = getConfig();
  // A CodexBar hand-off only opens an app: no provider lock, no switch flow, nothing to refresh.
  const handoff = codexHandoffFor(ctx, cfg);
  if (handoff) {
    await report(ctx, await handOffToCodexBar(ctx, handoff.reason));
    return;
  }
  const deps = buildDeps(cfg);
  let result: SwitchResult;
  try {
    result = await performSwitch(deps, ctx);
  } catch (error) {
    result = { state: "unknown", message: sanitize(error instanceof Error ? error.message : error) };
  }
  try {
    await ensureFinalRecord(deps.dir, ctx, result);
  } catch {
    // reporting only; the HUD still shows the result, and the list's watch ends at its timeout
  }
  runAfterSwitchCommand(cfg, ctx, result);
  await refreshMenuBar();
  await report(ctx, result);
}
