/**
 * Everything that can go wrong between Raycast and folnaro-mcp, as typed errors. Commands map
 * them to calm, localized toasts (`describeError` in `presentation.ts`); nothing here holds text
 * a person reads, apart from the helper's own tool error message.
 */

/** Permission switches of `mcp.permissions` (docs/mcp/README.md, Permissions). */
export type PermissionSwitch =
  "read" | "writeDrafts" | "finalize" | "cancel" | "send" | "markPaid" | "payments" | "expenses" | "time" | "settings";

export type FolnaroErrorKind =
  | "appNotInstalled"
  | "helperMissing"
  | "helperExited"
  | "timeout"
  | "protocol"
  | "notApproved"
  | "permissionDenied"
  | "readOnlyMode"
  | "timerRunning"
  | "timerNotRunning"
  | "duplicateReceipt"
  | "tool";

export class FolnaroError extends Error {
  readonly kind: FolnaroErrorKind;
  /** Tool the error came from, when it came from `tools/call`. */
  readonly tool?: string;
  /** Switch the user has to turn on (`permissionDenied` only). */
  readonly permission?: PermissionSwitch;
  /** JSON-RPC error code (`protocol` only). */
  readonly code?: number;
  /** Last lines the helper wrote to stderr (`helperExited`, `timeout`). */
  readonly stderr?: string;

  constructor(
    kind: FolnaroErrorKind,
    message: string,
    details: { tool?: string; permission?: PermissionSwitch; code?: number; stderr?: string } = {},
  ) {
    super(message);
    this.name = "FolnaroError";
    this.kind = kind;
    this.tool = details.tool;
    this.permission = details.permission;
    this.code = details.code;
    this.stderr = details.stderr;
  }
}

export function isFolnaroError(error: unknown): error is FolnaroError {
  return error instanceof FolnaroError;
}

/**
 * The switch each tool this extension calls needs, from the tool pages in docs/mcp/*.md
 * (column "Permission"). Used to name the switch in the toast, independent of the helper's
 * language.
 */
export const TOOL_PERMISSIONS: Record<string, PermissionSwitch> = {
  documents_list: "read",
  documents_pdf: "read",
  documents_create_draft: "writeDrafts",
  customers_search: "read",
  projects_list: "read",
  expenses_list: "read",
  expenses_create: "expenses",
  expenses_add_receipt_file: "expenses",
  expenses_delete: "expenses",
  time_running: "read",
  time_list: "read",
  time_start_timer: "time",
  time_stop_timer: "time",
};

/**
 * Tools that are locked in read-only mode after the trial (docs/mcp/README.md lists all 17).
 * Only the ones this extension calls matter here.
 */
export const LOCKED_AFTER_TRIAL = new Set(["documents_create_draft", "expenses_create", "time_start_timer"]);

/**
 * Classifies the text of a tool result with `isError: true`. The helper is always started in English
 * (`FOLNARO_LANGUAGE=en`), so every check matches the English catalog entries (FolnaroMCP and FolnaroData
 * Localizable.xcstrings):
 *
 * - error.client_not_approved and error.client_denied (the program itself is not approved in Settings > Agents):
 *   "has no access to Folnaro yet", "isn’t allowed to access Folnaro", "couldn’t identify this program".
 * - error.permission_denied always names the setting `mcp.permissions`.
 * - error.entitlement_locked: "read-only mode".
 * - store.error.timer_running: "A timer is already running.".
 * - store.error.duplicate_receipt: "You already imported this receipt.".
 * - error.timer_not_running: "No timer is running."
 */
export function classifyToolError(tool: string, message: string): FolnaroError {
  const text = message.trim();
  if (isNotApprovedText(text)) {
    return new FolnaroError("notApproved", text, { tool });
  }
  if (text.includes("mcp.permissions")) {
    return new FolnaroError("permissionDenied", text, { tool, permission: TOOL_PERMISSIONS[tool] });
  }
  if (/read-only mode/i.test(text)) {
    return new FolnaroError("readOnlyMode", text, { tool });
  }
  if (/timer is already running/i.test(text)) {
    return new FolnaroError("timerRunning", text, { tool });
  }
  if (/already imported this receipt/i.test(text)) {
    return new FolnaroError("duplicateReceipt", text, { tool });
  }
  if (/No timer is running/i.test(text)) {
    return new FolnaroError("timerNotRunning", text, { tool });
  }
  return new FolnaroError("tool", text, { tool });
}

/** JSON-RPC code of a request from a program the user has not approved (`MCPServer.clientNotApprovedCode`). */
export const CLIENT_NOT_APPROVED_CODE = -32001;

/** The helper's refusal of a program that is pending or denied in Settings > Agents (English catalog entries). */
export function isNotApprovedText(text: string): boolean {
  return /has no access to Folnaro yet|isn[’']t allowed to access Folnaro|couldn[’']t identify this program/i.test(
    text,
  );
}
