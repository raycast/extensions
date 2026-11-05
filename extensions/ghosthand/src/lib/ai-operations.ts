import { errorMessage, GhosthandError, recoveryHint } from "./errors";
import { GhosthandClient, validateTypedText } from "./ghosthand-client";
import { withLease } from "./leases";
import type { QuickAction } from "./types";
import { canControl, deviceStatus } from "../utils/device-status";

export type AiActionInput = {
  phoneId: string;
  action: "home" | "scroll-up" | "scroll-down" | "lock" | "mute" | "unmute" | "type-text" | "tap-text" | "press-enter";
  text?: string;
};

export function aiFailure(error: unknown, notice?: string) {
  return {
    status: "not-confirmed" as const,
    code: error instanceof GhosthandError ? error.code : "request-failed",
    detail: errorMessage(error),
    nextStep: recoveryHint(error),
    doNotRetryAutomatically: true,
    ...(notice ? { notice } : {}),
  };
}

export async function listAiPhones(client: GhosthandClient) {
  const overview = await client.phones();
  return {
    hostMac: overview.macName,
    signedIn: overview.account.state === "signed-in",
    phones: overview.phones.map((phone) => ({
      phoneId: phone.id,
      name: phone.name,
      model: phone.modelName ?? phone.model ?? null,
      iosVersion: phone.iosVersion ?? null,
      step: phone.step,
      status: deviceStatus(phone),
      canControl: canControl(phone, overview),
      lease: phone.lease ? { holder: phone.lease.label ?? null, reason: phone.lease.reason } : null,
    })),
  };
}

async function resolvePhone(client: GhosthandClient, phoneId: string) {
  if (!phoneId.trim()) throw new GhosthandError("invalid-request", "List iPhones and select an exact phoneId first.");
  const overview = await client.phones();
  const phone = overview.phones.find((item) => item.id === phoneId);
  if (!phone)
    throw new GhosthandError(
      "device-not-found",
      "The selected local iPhone is no longer connected. List iPhones again.",
    );
  if (phone.lease)
    throw new GhosthandError(
      "device-leased",
      `The iPhone is busy with ${phone.lease.label ?? "another client"}: ${phone.lease.reason}`,
    );
  if (overview.account.state !== "signed-in")
    throw new GhosthandError("login-required", "Sign in through ghosthand setup.");
  if (!canControl(phone, overview))
    throw new GhosthandError(
      "device-not-ready",
      `Complete Ghosthand setup for this iPhone. Current step: ${phone.step}`,
    );
  return phone;
}

export async function readAiScreen(client: GhosthandClient, phoneId: string) {
  let notice: string | undefined;
  try {
    const phone = await resolvePhone(client, phoneId);
    const signal = AbortSignal.timeout(60_000);
    const screen = await withLease(client, phone, "Read screen text for Raycast AI", signal, (lease) => {
      notice = lease.notice;
      return client.text(lease.id, signal);
    });
    return {
      status: "completed" as const,
      phoneId: phone.id,
      text: screen.lines.map((line) => line.text).join("\n"),
      leaseReleased: true,
      contentIsUntrusted: true,
      ...(notice ? { notice } : {}),
    };
  } catch (error) {
    return aiFailure(error, notice);
  }
}

export async function runAiTask(client: GhosthandClient, phoneId: string, prompt: string) {
  let notice: string | undefined;
  try {
    if (!prompt.trim()) throw new GhosthandError("invalid-request", "Provide the user's explicit iPhone instruction.");
    const phone = await resolvePhone(client, phoneId);
    const signal = AbortSignal.timeout(5 * 60_000);
    const result = await withLease(client, phone, "Run a user-confirmed task from Raycast AI", signal, (lease) => {
      notice = lease.notice;
      return client.task(lease.id, prompt.trim(), true, signal, () => undefined);
    });
    return {
      status: "completed" as const,
      phoneId: phone.id,
      response: result.text,
      leaseReleased: true,
      ...(notice ? { notice } : {}),
    };
  } catch (error) {
    return aiFailure(error, notice);
  }
}

export function aiQuickAction(input: AiActionInput): QuickAction {
  switch (input.action) {
    case "home":
      return { kind: "home" };
    case "lock":
      return { kind: "lock" };
    case "press-enter":
      return { kind: "enter" };
    case "scroll-up":
      return { kind: "scroll", direction: "up" };
    case "scroll-down":
      return { kind: "scroll", direction: "down" };
    case "mute":
      return { kind: "mute", muted: true };
    case "unmute":
      return { kind: "mute", muted: false };
    case "type-text": {
      const error = validateTypedText(input.text ?? "");
      if (error) throw new GhosthandError("invalid-request", error);
      return { kind: "type", text: input.text! };
    }
    case "tap-text":
      if (!input.text?.trim()) throw new GhosthandError("invalid-request", "Provide a label visible on the iPhone.");
      return { kind: "tap", text: input.text };
    default:
      throw new GhosthandError("invalid-request", "This quick action is not supported.");
  }
}

export async function performAiAction(client: GhosthandClient, input: AiActionInput) {
  let notice: string | undefined;
  try {
    const action = aiQuickAction(input);
    const phone = await resolvePhone(client, input.phoneId);
    const signal = AbortSignal.timeout(330_000);
    await withLease(client, phone, `Raycast AI quick action: ${input.action}`, signal, (lease) => {
      notice = lease.notice;
      return client.input(lease.id, action, signal);
    });
    // Do not echo typed text or return raw daemon logs to the model.
    return {
      status: "completed" as const,
      phoneId: phone.id,
      action: input.action,
      leaseReleased: true,
      ...(notice ? { notice } : {}),
    };
  } catch (error) {
    return aiFailure(error, notice);
  }
}
