import type { SessionStatus } from "../pass/pass-cli";
export function createSession(source: { getSessionStatus(): Promise<SessionStatus> }) {
  return { getStatus: source.getSessionStatus };
}
export type { SessionStatus };
