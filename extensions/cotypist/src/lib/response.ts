export type Operation =
  "status" | "enable-default" | "disable-default" | "toggle-default";
export type CompletionState = {
  defaultEnabled: boolean;
  originalDefaultEnabled: boolean;
  changed: boolean;
  version: string;
  method: "native-accessibility";
  model?: string;
  downloadProgress?: number;
  warnings: string[];
  disableConfirmationHandled?: boolean;
};

export function parseResponse(output: string): CompletionState {
  let data: unknown;
  try {
    data = JSON.parse(output.trim());
  } catch {
    throw new Error(
      "Cotypist's native control returned an unreadable response. No success is assumed.",
    );
  }
  if (!data || typeof data !== "object")
    throw new Error("Cotypist's native control did not return a state.");
  const value = data as Record<string, unknown>;
  if (value.ok === false && typeof value.error === "string") {
    const warnings = Array.isArray(value.warnings)
      ? value.warnings.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    throw new Error([value.error, ...warnings].join(" "));
  }
  if (
    value.ok !== true ||
    typeof value.defaultEnabled !== "boolean" ||
    typeof value.originalDefaultEnabled !== "boolean" ||
    typeof value.changed !== "boolean" ||
    typeof value.version !== "string" ||
    value.method !== "native-accessibility"
  )
    throw new Error(
      "Cotypist's native control did not verify the completion state.",
    );
  if (value.changed !== (value.defaultEnabled !== value.originalDefaultEnabled))
    throw new Error(
      "Cotypist's native control returned inconsistent state information.",
    );
  if (
    value.disableConfirmationHandled !== undefined &&
    typeof value.disableConfirmationHandled !== "boolean"
  )
    throw new Error(
      "Cotypist returned an invalid confirmation acknowledgement.",
    );
  if (value.model !== undefined && typeof value.model !== "string")
    throw new Error("Cotypist returned an unexpected model label.");
  if (
    value.downloadProgress !== undefined &&
    (typeof value.downloadProgress !== "number" ||
      !Number.isFinite(value.downloadProgress) ||
      value.downloadProgress < 0 ||
      value.downloadProgress > 1)
  )
    throw new Error("Cotypist returned an unexpected download progress value.");
  if (
    !Array.isArray(value.warnings) ||
    value.warnings.some((warning) => typeof warning !== "string")
  )
    throw new Error("Cotypist returned an unexpected restoration result.");
  return value as CompletionState;
}

export function assertOperation(
  operation: Operation,
  state: CompletionState,
): CompletionState {
  if (operation === "enable-default" && !state.defaultEnabled)
    throw new Error(
      "Cotypist did not confirm that default completions are enabled.",
    );
  if (operation === "disable-default" && state.defaultEnabled)
    throw new Error(
      "Cotypist did not confirm that default completions are disabled.",
    );
  if (operation === "toggle-default" && !state.changed)
    throw new Error(
      "Cotypist did not confirm a changed default-completion state.",
    );
  if (operation === "status" && state.changed)
    throw new Error(
      "A status read unexpectedly changed Cotypist's setting. Check General settings.",
    );
  if (
    (operation === "disable-default" || operation === "toggle-default") &&
    state.changed &&
    !state.defaultEnabled &&
    state.disableConfirmationHandled !== true
  )
    throw new Error(
      "Cotypist's native disable confirmation was not acknowledged.",
    );
  return state;
}
