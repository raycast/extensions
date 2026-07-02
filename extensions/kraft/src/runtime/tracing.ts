import { randomBytes } from "crypto";

export interface AITraceContext {
  traceId: string;
  spanId: string;
  traceparent: string;
  clientRequestId: string;
  sessionId: string;
  userId?: string;
  tenantId?: string;
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export function createSessionId(): string {
  return `session-${randomHex(16)}`;
}

export function createTraceContext(input: {
  clientRequestId: string;
  sessionId: string;
  userId?: string;
  tenantId?: string;
}): AITraceContext {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  return {
    traceId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-01`,
    clientRequestId: input.clientRequestId,
    sessionId: input.sessionId,
    userId: input.userId,
    tenantId: input.tenantId,
  };
}

export function traceHeaders(trace: AITraceContext | undefined): Record<string, string> {
  if (!trace) {
    return {};
  }

  return {
    traceparent: trace.traceparent,
    "x-client-request-id": trace.clientRequestId,
    "x-session-id": trace.sessionId,
    ...(trace.userId ? { "x-user-id": trace.userId } : {}),
    ...(trace.tenantId ? { "x-tenant-id": trace.tenantId } : {}),
  };
}
