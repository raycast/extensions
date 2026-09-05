import {
  AmbiguousMutationError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PartialRefreshError,
  PermissionError,
  ProtocolError,
  RateLimitError,
  ValidationError,
} from "../domain/errors";

export type ErrorPresentationContext = "read" | "mutation";
export type ErrorPresentationSeverity = "warning" | "error";

export type ReconnectAction = Readonly<{ kind: "reconnect"; title: "Reconnect" }>;
export type OpenPreferencesAction = Readonly<{ kind: "open-preferences"; title: "Open Preferences" }>;
export type RefreshAction = Readonly<{ kind: "refresh"; title: "Refresh" }>;
export type RetryAction = Readonly<{ kind: "retry"; title: "Retry"; mode: "manual" }>;
export type ErrorRecoveryAction = ReconnectAction | OpenPreferencesAction | RefreshAction | RetryAction;

type ErrorPresentationBase<Kind extends string, Actions extends readonly ErrorRecoveryAction[]> = Readonly<{
  kind: Kind;
  title: string;
  message: string;
  severity: ErrorPresentationSeverity;
  retainData: boolean;
  actions: Actions;
}>;

type AuthenticationPresentation = ErrorPresentationBase<
  "authentication",
  readonly [ReconnectAction, OpenPreferencesAction]
>;
type PermissionPresentation = ErrorPresentationBase<"permission", readonly [OpenPreferencesAction]>;
type NotFoundPresentation = ErrorPresentationBase<"not-found", readonly [RefreshAction]>;
type RateLimitPresentation = ErrorPresentationBase<"rate-limit", readonly [RetryAction]> &
  Readonly<{ retryAfterMs?: number }>;
type NetworkPresentation = ErrorPresentationBase<"network", readonly [RefreshAction] | readonly [RetryAction]>;
type PartialRefreshPresentation = ErrorPresentationBase<"partial-refresh", readonly [RefreshAction]>;
type ProtocolPresentation = ErrorPresentationBase<"protocol", readonly [RefreshAction]>;
type AmbiguousMutationPresentation = ErrorPresentationBase<"ambiguous-mutation", readonly [RefreshAction]>;
type ValidationPresentation = ErrorPresentationBase<"validation", readonly []>;
type UnknownPresentation = ErrorPresentationBase<"unknown", readonly []>;

export type ErrorPresentation =
  | AuthenticationPresentation
  | PermissionPresentation
  | NotFoundPresentation
  | RateLimitPresentation
  | NetworkPresentation
  | PartialRefreshPresentation
  | ProtocolPresentation
  | AmbiguousMutationPresentation
  | ValidationPresentation
  | UnknownPresentation;

const reconnectAction: ReconnectAction = { kind: "reconnect", title: "Reconnect" };
const openPreferencesAction: OpenPreferencesAction = { kind: "open-preferences", title: "Open Preferences" };
const refreshAction: RefreshAction = { kind: "refresh", title: "Refresh" };
const retryAction: RetryAction = { kind: "retry", title: "Retry", mode: "manual" };

export function presentError(error: unknown, context: ErrorPresentationContext): ErrorPresentation {
  try {
    return classifyError(error, context);
  } catch {
    return unknownPresentation();
  }
}

function classifyError(error: unknown, context: ErrorPresentationContext): ErrorPresentation {
  if (error instanceof AuthenticationError) {
    return {
      kind: "authentication",
      title: "Reconnect TickTick",
      message: "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.",
      severity: "error",
      retainData: true,
      actions: [reconnectAction, openPreferencesAction],
    };
  }

  if (error instanceof PermissionError) {
    return {
      kind: "permission",
      title: "Permission Required",
      message: "TickTick did not grant permission for this action. Check authentication settings in preferences.",
      severity: "error",
      retainData: true,
      actions: [openPreferencesAction],
    };
  }

  if (error instanceof NotFoundError) {
    return {
      kind: "not-found",
      title: "Task No Longer Available",
      message: "This task no longer exists in TickTick. Refresh to update the list.",
      severity: "warning",
      retainData: false,
      actions: [refreshAction],
    };
  }

  if (error instanceof RateLimitError) {
    const retryAfterMs = validRetryAfterMs(error.retryAfterMs);
    return {
      kind: "rate-limit",
      title: "TickTick Is Temporarily Busy",
      message: "TickTick is limiting requests. Retry manually when ready.",
      severity: "warning",
      retainData: true,
      actions: [retryAction],
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    };
  }

  if (error instanceof NetworkError) {
    return context === "read"
      ? {
          kind: "network",
          title: "TickTick Is Unreachable",
          message: "Couldn't reach TickTick. Available tasks may be out of date.",
          severity: "error",
          retainData: true,
          actions: [refreshAction],
        }
      : {
          kind: "network",
          title: "Couldn't Update Task",
          message: "Couldn't reach TickTick. Retry the change manually.",
          severity: "error",
          retainData: true,
          actions: [retryAction],
        };
  }

  if (error instanceof PartialRefreshError) {
    return {
      kind: "partial-refresh",
      title: "Some Tasks Couldn't Be Refreshed",
      message: "Available tasks are shown, but some TickTick data could not be refreshed.",
      severity: "warning",
      retainData: true,
      actions: [refreshAction],
    };
  }

  if (error instanceof ProtocolError) {
    return {
      kind: "protocol",
      title: "Unsupported TickTick Response",
      message: "TickTick returned data this extension could not safely process.",
      severity: "error",
      retainData: true,
      actions: [refreshAction],
    };
  }

  if (error instanceof AmbiguousMutationError) {
    return {
      kind: "ambiguous-mutation",
      title: "Task Update Status Unknown",
      message: "TickTick may have applied this change. Refresh before trying again.",
      severity: "warning",
      retainData: true,
      actions: [refreshAction],
    };
  }

  if (error instanceof ValidationError) {
    return {
      kind: "validation",
      title: "Invalid Task Details",
      message: "Review the task details and try again.",
      severity: "error",
      retainData: true,
      actions: [],
    };
  }

  return unknownPresentation();
}

function unknownPresentation(): UnknownPresentation {
  return {
    kind: "unknown",
    title: "Something Went Wrong",
    message: "TickTick couldn't complete the request.",
    severity: "error",
    retainData: true,
    actions: [],
  };
}

function validRetryAfterMs(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
