import { Account, errorMessage, StatusChange } from "./domain";
import { slackRequest } from "./slack";

export type Operation = "status" | "presence" | "notifications";
export interface ChangeResult {
  operation: Operation;
  ok: boolean;
  error?: string;
}
export interface AccountResult {
  account: Account;
  changes: ChangeResult[];
}
type CallSlack = (method: string, token: string, payload: Record<string, unknown>) => Promise<unknown>;

export function operationsFor(request: StatusChange): Operation[] {
  return [
    ...(request.profile ? ["status" as const] : []),
    ...(request.presence === "keep" ? [] : ["presence" as const]),
    ...(request.notifications === "keep" ? [] : ["notifications" as const]),
  ];
}

export async function applyToAccount(
  account: Account,
  request: StatusChange,
  getToken: () => Promise<string>,
  previous?: AccountResult,
  callSlack: CallSlack = slackRequest,
  now = Date.now,
): Promise<AccountResult> {
  const changes: ChangeResult[] = [];
  const expiration = request.profile?.status_expiration ?? 0;
  const pending = operationsFor(request).filter(
    (operation) => !previous?.changes.some((change) => change.operation === operation && change.ok),
  );
  let token: string;
  try {
    if (expiration !== 0 && expiration <= Math.floor(now() / 1000)) {
      throw new Error("The original status duration has expired. Apply a new status instead.");
    }
    token = pending.length ? await getToken() : "";
  } catch (error) {
    return {
      account,
      changes: operationsFor(request).map(
        (operation) =>
          previous?.changes.find((change) => change.operation === operation && change.ok) ?? {
            operation,
            ok: false,
            error: errorMessage(error),
          },
      ),
    };
  }
  for (const operation of operationsFor(request)) {
    const success = previous?.changes.find((change) => change.operation === operation && change.ok);
    if (success) {
      changes.push(success);
      continue;
    }
    try {
      if (expiration !== 0 && expiration <= Math.floor(now() / 1000)) {
        throw new Error("The original status duration has expired. Apply a new status instead.");
      }
      if (operation === "status") await callSlack("users.profile.set", token, { profile: request.profile });
      if (operation === "presence") await callSlack("users.setPresence", token, { presence: request.presence });
      if (operation === "notifications") {
        if (request.notifications === "pause") {
          const minutes = Math.ceil((expiration - Math.floor(now() / 1000)) / 60);
          await callSlack("dnd.setSnooze", token, { num_minutes: minutes });
        } else {
          await callSlack("dnd.endSnooze", token, {});
        }
      }
      changes.push({ operation, ok: true });
    } catch (error) {
      changes.push({ operation, ok: false, error: errorMessage(error) });
    }
  }
  return { account, changes };
}
