import { showToast, Toast } from "@raycast/api";
import { FmError, SETUP_ERROR_KINDS } from "../lib/fm/errors";
import { explainFmError } from "../lib/fm/explain";
import { invalidatePreflight, launchCheckSetup } from "./preflight";

export function toFmError(error: unknown): FmError {
  if (error instanceof FmError) return error;
  if (error instanceof Error) return new FmError("unknown", error.message);
  return new FmError("unknown", String(error));
}

export function isSetupError(error: FmError): boolean {
  return SETUP_ERROR_KINDS.has(error.kind);
}

export async function showFmErrorToast(error: unknown): Promise<void> {
  const fmError = toFmError(error);
  const setup = isSetupError(fmError);
  if (setup) invalidatePreflight();

  await showToast({
    style: Toast.Style.Failure,
    title: explainFmError(fmError).title,
    ...(setup && { primaryAction: { title: "Check Setup", onAction: () => launchCheckSetup() } }),
  });
}
