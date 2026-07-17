/**
 * Toast lifecycle for operations — the single feedback channel.
 *
 * One owner per toast: the operation owner (runner or Lane-A view) creates ONE
 * Animated toast, updates it from progress, and flips the SAME toast to its
 * terminal state. There is no HUD logic here on purpose: the platform renders
 * a toast as a HUD when the window is hidden (a pending HUD persists until the
 * window reactivates — that IS the persistent background notification), and
 * force-closes pending toasts on window deactivation — which the owner heals
 * by re-asserting the toast on its heartbeat (any property update re-opens a
 * closed toast).
 */

import { Clipboard, showToast, Toast } from "@raycast/api";

import { type WingetProgressState } from "../cli/types";

import { type OperationKind, type OperationState } from "./operations";

function operationTitle(kind: OperationKind, name?: string): string {
  const target = name ?? "package";
  switch (kind) {
    case "install":
    case "install-version":
      return `Installing ${target}`;
    case "upgrade":
      return `Upgrading ${target}`;
    case "uninstall":
      return `Uninstalling ${target}`;
    case "repair":
      return `Repairing ${target}`;
    case "download":
      return `Downloading ${target}`;
    case "pin":
      return `Pinning ${target}`;
    case "unpin":
      return `Unpinning ${target}`;
    case "upgrade-all":
      return "Upgrading all packages";
    case "uninstall-all":
      return "Uninstalling packages";
    case "import":
      return "Importing packages";
    case "export":
      return "Exporting packages";
  }
}

function progressMessage(progress: WingetProgressState): string | undefined {
  switch (progress.type) {
    case "initializing":
      return "Preparing…";
    case "downloading":
      if (progress.unit === "%") {
        return `Downloading ${progress.current}%`;
      }
      if (progress.total > 0) {
        return `Downloading ${progress.current} / ${progress.total} ${progress.unit}`;
      }
      if (progress.current > 0) {
        return `Downloading ${progress.current} ${progress.unit}`;
      }
      return "Downloading…";
    case "verifying":
      return "Verifying installer hash…";
    case "installing":
      return "Installing…";
    case "uninstalling":
      return "Uninstalling…";
    case "repairing":
      return "Repairing…";
    case "complete":
      return progress.message;
  }
}

function bulkVerb(state: OperationState): string {
  return state.kind === "uninstall-all" ? "uninstalled" : "upgraded";
}

function withSkipped(title: string, skipped: number): string {
  return skipped > 0 ? `${title}, ${skipped} skipped` : title;
}

function successTitle(state: OperationState): string {
  const name = state.target?.name ?? "package";
  if (state.bulk) {
    return withSkipped(`${state.bulk.succeeded} ${bulkVerb(state)}`, state.bulk.skipped);
  }
  switch (state.kind) {
    case "install":
    case "install-version":
      return `Installed ${name}`;
    case "upgrade":
      return `Upgraded ${name}`;
    case "uninstall":
      return `Uninstalled ${name}`;
    case "repair":
      return `Repaired ${name}`;
    case "download":
      return `Downloaded ${name} installer`;
    case "pin":
      return `Pinned ${name}`;
    case "unpin":
      return `Unpinned ${name}`;
    case "import":
      return "Packages imported";
    case "export":
      return "Packages exported";
    default:
      return "Done";
  }
}

function noopTitle(state: OperationState): string {
  const name = state.target?.name ?? "Package";
  if (state.bulk && state.bulk.skipped > 0) {
    // Everything was skipped: winget had no applicable action for any target.
    return `Nothing ${bulkVerb(state)}, ${state.bulk.skipped} skipped (no applicable update)`;
  }
  switch (state.kind) {
    case "install":
    case "install-version":
      return `${name} is already installed`;
    case "upgrade":
      return `${name} is already up to date`;
    case "upgrade-all":
      return "All packages are up to date";
    case "pin":
      return `${name} is already pinned`;
    case "unpin":
      return `${name} is not pinned`;
    default:
      return `${name} unchanged`;
  }
}

/**
 * Clipboard payload for Copy Error Details: the failure title, the message,
 * and — for bulk runs — the per-package reasons, so a "3 failed" outcome is
 * diagnosable without re-running anything.
 */
function failureDetails(state: OperationState): string {
  const lines = [failureTitle(state), state.errorMessage ?? state.message ?? "", ...(state.bulk?.failedDetails ?? [])];
  return lines.filter(Boolean).join("\n");
}

function failureTitle(state: OperationState): string {
  const name = state.target?.name ?? "package";
  if (state.bulk && state.bulk.total > 0) {
    return withSkipped(`${state.bulk.succeeded} ${bulkVerb(state)}, ${state.bulk.failed} failed`, state.bulk.skipped);
  }
  switch (state.kind) {
    case "install":
    case "install-version":
      return `Failed to install ${name}`;
    case "upgrade":
      return `Failed to upgrade ${name}`;
    case "uninstall":
      return `Failed to uninstall ${name}`;
    case "repair":
      return `Failed to repair ${name}`;
    case "download":
      return `Failed to download ${name}`;
    case "pin":
      return `Failed to pin ${name}`;
    case "unpin":
      return `Failed to unpin ${name}`;
    case "import":
      return "Import failed";
    case "export":
      return "Export failed";
    default:
      return "Operation failed";
  }
}

function cancelTitle(state: OperationState): string {
  if (state.bulk && state.bulk.total > 0) {
    return `Cancelled after ${state.bulk.succeeded} ${bulkVerb(state)}, ${state.bulk.failed} failed`;
  }
  return state.target?.name ? `Cancelled: ${state.target.name}` : "Operation cancelled";
}

function showOperationToast(title: string): Promise<Toast> {
  return showToast({
    style: Toast.Style.Animated,
    title,
    message: "Starting…",
  });
}

async function showBusyToast(holderTitle: string | undefined): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: `${holderTitle ?? "A WinGet operation"} is in progress`,
    message: "Wait for it to finish or cancel it first",
  });
}

/**
 * Flip the owner's toast to its terminal state. MUST be awaited before the
 * owning command's promise resolves — toast property setters are
 * fire-and-forget and race the worker unload otherwise.
 */
async function finalizeOperationToast(toast: Toast, state: OperationState): Promise<void> {
  switch (state.status) {
    case "succeeded":
      toast.style = Toast.Style.Success;
      toast.title = successTitle(state);
      toast.message = state.kind === "download" ? state.downloadPath : state.message;
      break;
    case "noop":
      toast.style = Toast.Style.Success;
      toast.title = noopTitle(state);
      toast.message = undefined;
      break;
    case "cancelled":
      toast.style = Toast.Style.Failure;
      toast.title = cancelTitle(state);
      toast.message = "The package may be in an inconsistent state";
      break;
    case "interrupted":
      toast.style = Toast.Style.Failure;
      toast.title = "Operation interrupted";
      toast.message = state.errorMessage ?? state.message;
      break;
    default:
      toast.style = Toast.Style.Failure;
      toast.title = failureTitle(state);
      toast.message = state.errorMessage ?? state.message;
      break;
  }

  if (state.status === "failed" && (state.errorMessage || state.message)) {
    const details = failureDetails(state);
    toast.primaryAction = {
      title: "Copy Error Details",
      onAction: () => {
        void Clipboard.copy(details);
      },
    };
  }

  // show() re-opens/updates and resolves once delivered — this is the await
  // that keeps the terminal state from racing the worker unload.
  await toast.show();
}

export {
  cancelTitle,
  failureDetails,
  failureTitle,
  finalizeOperationToast,
  noopTitle,
  operationTitle,
  progressMessage,
  showBusyToast,
  showOperationToast,
  successTitle,
};
