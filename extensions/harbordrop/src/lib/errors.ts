export type ErrorCode =
  | "missing"
  | "integrationDisabled"
  | "incompatibleSchema"
  | "malformed"
  | "unreadable"
  | "permissionDenied"
  | "stale"
  | "notReady"
  | "requestConflict"
  | "invalidURL"
  | "unsupportedAction"
  | "appMissing"
  | "ambiguousApp"
  | "appOpenFailed"
  | "cancelled"
  | "upgradeRequired"
  | "accessChecking"
  | "licenseRequired"
  | "verificationRequired"
  | "integrityBlocked"
  | "accessExpired"
  | "appSignatureInvalid"
  | "appVerificationFailed"
  | "appChanged";

const messages: Record<ErrorCode, string> = {
  upgradeRequired:
    "Update HarborDrop to a version that supports the current Raycast access policy.",
  accessChecking:
    "HarborDrop is checking access. Downloads will appear after verification finishes.",
  licenseRequired:
    "An active license or valid trial is required. Open HarborDrop to purchase or activate access.",
  verificationRequired:
    "Open HarborDrop to verify your existing access. Your license information has not been removed.",
  integrityBlocked:
    "HarborDrop could not confirm its app integrity. Install the official app before using this integration.",
  accessExpired:
    "The shared access confirmation has expired. Open HarborDrop and refresh to verify current access.",
  appSignatureInvalid:
    "This application does not meet HarborDrop's official signing requirements. Install the official app.",
  appVerificationFailed:
    "The app signature could not be verified. Check access to HarborDrop and try again.",
  appChanged:
    "HarborDrop changed during verification. Wait for any update to finish, then try again.",
  missing: "Open HarborDrop and enable Raycast integration in Settings.",
  integrationDisabled: "Enable Raycast integration in HarborDrop Settings.",
  incompatibleSchema:
    "This version of HarborDrop uses a different integration contract. Open the app to check for updates.",
  malformed:
    "The shared state could not be validated. Open HarborDrop to refresh it.",
  unreadable:
    "The integration files could not be read. Open HarborDrop to check its integration status.",
  permissionDenied:
    "Raycast cannot access the private integration files. Check access permissions, then try again.",
  stale:
    "The shared state is out of date. Open HarborDrop, then refresh this command.",
  notReady:
    "HarborDrop is starting, reconciling, or shutting down. Open the app and refresh when it is ready.",
  requestConflict:
    "This request already exists or its contents changed. Check its result in HarborDrop.",
  invalidURL: "Enter one HTTP or HTTPS URL without embedded credentials.",
  unsupportedAction:
    "This action is not available for the current download state. Refresh or open HarborDrop.",
  appMissing:
    "HarborDrop is not installed. Install the app separately before using this extension.",
  ambiguousApp:
    "Multiple HarborDrop applications were found. Open the intended copy manually and resolve duplicate installations.",
  appOpenFailed:
    "HarborDrop could not be opened. Open the app manually and check the request there.",
  cancelled:
    "Stopped checking the request. HarborDrop may still be handling it.",
};

export class IntegrationError extends Error {
  constructor(readonly code: ErrorCode) {
    super(messages[code]);
    this.name = "IntegrationError";
  }
}

export function safeMessage(error: unknown): string {
  return error instanceof IntegrationError
    ? error.message
    : messages.unreadable;
}

export function ioError(error: unknown): IntegrationError {
  if (error instanceof IntegrationError) return error;
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "ENOENT") return new IntegrationError("missing");
  if (code === "EACCES" || code === "EPERM")
    return new IntegrationError("permissionDenied");
  if (code === "EEXIST") return new IntegrationError("requestConflict");
  return new IntegrationError("unreadable");
}

const PRIVATE_STATE_FAILURES = new Set<ErrorCode>([
  "integrationDisabled",
  "incompatibleSchema",
  "upgradeRequired",
  "accessChecking",
  "licenseRequired",
  "verificationRequired",
  "integrityBlocked",
  "accessExpired",
  "appSignatureInvalid",
  "appVerificationFailed",
  "appChanged",
  "appMissing",
  "ambiguousApp",
]);

export function mustClearSharedState(error: unknown): boolean {
  return (
    error instanceof IntegrationError && PRIVATE_STATE_FAILURES.has(error.code)
  );
}

const RECEIPT_REASONS: Record<string, string> = {
  licenseBlocked: "Open HarborDrop to check license or trial access.",
  integrityBlocked: messages.integrityBlocked,
  verificationRequired: messages.verificationRequired,
  integrationDisabled: messages.integrationDisabled,
  incompatibleSchema: messages.incompatibleSchema,
  refreshRequired: messages.stale,
  stateChanged:
    "This download changed. Refresh the shared state before making another request.",
  taskNotFound:
    "This download is no longer in the shared list. Check HarborDrop for its current state.",
  permissionDenied:
    "HarborDrop could not access the requested destination or file. Check permissions in the app.",
  outputMissing:
    "The completed file is unavailable. Check its location in HarborDrop.",
  outputChanged:
    "The completed file changed. Check the file in HarborDrop before revealing it.",
  sourceContextRequired:
    "This download needs browser authentication or request context. Use the browser extension.",
  ticketRefreshPending:
    "HarborDrop is verifying download access. Check the request in the app.",
  reconciliationRequired:
    "The result needs reconciliation in HarborDrop. Do not resend this request.",
  appRestarted:
    "HarborDrop restarted while handling this request. Check its recorded result before sending another request.",
  expired:
    "This request expired before approval. Check HarborDrop before sending another request.",
};

export function receiptReasonMessage(
  reason: string | undefined,
): string | undefined {
  if (!reason) return undefined;
  return Object.hasOwn(RECEIPT_REASONS, reason)
    ? RECEIPT_REASONS[reason]
    : "Open HarborDrop to check the recorded reason.";
}

export function isAppVerificationFailure(
  error: unknown,
): error is IntegrationError {
  return (
    error instanceof IntegrationError &&
    [
      "appSignatureInvalid",
      "appVerificationFailed",
      "appChanged",
      "appMissing",
      "ambiguousApp",
    ].includes(error.code)
  );
}

export type VerificationFailureHandler = (error: IntegrationError) => void;

export async function openWithVerificationFailure<T>(
  open: () => Promise<T>,
  onVerificationFailure: VerificationFailureHandler,
): Promise<T> {
  try {
    return await open();
  } catch (error) {
    if (isAppVerificationFailure(error)) onVerificationFailure(error);
    throw error;
  }
}
