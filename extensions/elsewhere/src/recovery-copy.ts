import { ElsewhereStateReadResult } from "./state-reader";

export interface ElsewhereRecoveryCopy {
  title: string;
  message: string;
  canOpenAndRetry: boolean;
}

export function elsewhereRecoveryCopy(state: ElsewhereStateReadResult): ElsewhereRecoveryCopy {
  if (state.kind === "stale") {
    return {
      title: "Elsewhere Isn’t Running",
      message: "Open Elsewhere and retry this command when its controls are ready?",
      canOpenAndRetry: true,
    };
  }
  if (state.kind === "unsupported") {
    return {
      title: "Update the Elsewhere Extension",
      message: `Snapshot schema ${state.schemaVersion} is not supported.`,
      canOpenAndRetry: false,
    };
  }
  if (state.kind === "malformed") {
    return {
      title: "Elsewhere State Could Not Be Read",
      message: "Open Elsewhere, refresh its state, and retry this command?",
      canOpenAndRetry: true,
    };
  }
  if (state.kind === "error") {
    return {
      title: "Elsewhere State Is Unavailable",
      message: "Open Elsewhere and retry this command when its controls are ready?",
      canOpenAndRetry: true,
    };
  }
  if (state.kind === "ready" && !state.snapshot.ready) {
    return {
      title: state.snapshot.requiresSetup ? "Finish Setting Up Elsewhere" : "Elsewhere Is Starting",
      message: state.snapshot.requiresSetup
        ? "Open Elsewhere and retry this command when setup is complete?"
        : "Wait for Elsewhere to become ready, then retry this command?",
      canOpenAndRetry: true,
    };
  }
  return {
    title: "Open Elsewhere First",
    message: "Open Elsewhere and retry this command when its controls are ready?",
    canOpenAndRetry: true,
  };
}
