export type AuthTransport = "bearer" | "basic" | "query";

/** Ordered: the transports that keep the token out of the URL come first. */
export const AUTH_TRANSPORTS: AuthTransport[] = ["bearer", "basic", "query"];

export interface Instance {
  id: string;
  label: string;
  /** Normalised, including any path prefix. Never ends in a slash. */
  baseUrl: string;
  token: string;
  authTransport?: AuthTransport;
  userId?: number;
  userName?: string;
  apiV2Available?: boolean;
  lastError?: string;
}

export interface EntityState {
  id: number;
  name: string;
  isFinal: boolean;
  /** Workflow position, which is what My Work orders its sections by. */
  numericPriority: number;
}

export interface Entity {
  id: number;
  name: string;
  /** From EntityType[Name]. A row's own ResourceType is the base type and is useless for badging. */
  type: string;
  /** Null for entities with no workflow, such as a Release or a Project. */
  state: EntityState | null;
  projectName: string | null;
  modifyDate: string | null;
}

export type FailureKind =
  "unreachable" | "unauthorised" | "not-targetprocess" | "not-found" | "rate-limited" | "server" | "unexpected";

export class TargetprocessError extends Error {
  constructor(
    readonly kind: FailureKind,
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "TargetprocessError";
  }
}
