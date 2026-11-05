import { GhosthandError, isRecord } from "./errors";
import type { Lease, PhoneOverview, ScreenText, Schemas } from "./types";

function invalidResponse(): never {
  throw new GhosthandError(
    "invalid-response",
    "Ghosthand returned an incompatible response. Check the daemon version and inspect the screen before retrying.",
  );
}

export function phoneOverview(value: unknown): PhoneOverview {
  if (
    !isRecord(value) ||
    typeof value.macName !== "string" ||
    !isRecord(value.account) ||
    typeof value.account.state !== "string" ||
    !isRecord(value.bluetooth) ||
    typeof value.bluetooth.state !== "string" ||
    typeof value.camera !== "string" ||
    !Array.isArray(value.phones)
  )
    invalidResponse();
  for (const phone of value.phones) {
    if (
      !isRecord(phone) ||
      typeof phone.id !== "string" ||
      typeof phone.name !== "string" ||
      typeof phone.step !== "string" ||
      typeof phone.control !== "string" ||
      !Array.isArray(phone.waiting)
    )
      invalidResponse();
    for (const field of ["captureId", "model", "modelName", "iosVersion", "mac", "macName"]) {
      if (phone[field] !== undefined && typeof phone[field] !== "string") invalidResponse();
    }
    if (
      phone.lease !== undefined &&
      (!isRecord(phone.lease) ||
        typeof phone.lease.reason !== "string" ||
        typeof phone.lease.expiresAt !== "string" ||
        (phone.lease.label !== undefined && typeof phone.lease.label !== "string") ||
        (phone.lease.lastCommand !== undefined && typeof phone.lease.lastCommand !== "string"))
    )
      invalidResponse();
    if (phone.bluetooth !== undefined && (!isRecord(phone.bluetooth) || typeof phone.bluetooth.state !== "string"))
      invalidResponse();
    if (
      phone.xctest !== undefined &&
      (!isRecord(phone.xctest) || (phone.xctest.error !== undefined && typeof phone.xctest.error !== "string"))
    )
      invalidResponse();
  }
  return value as PhoneOverview;
}

export function leaseResponse(value: unknown): Lease {
  if (!isRecord(value) || typeof value.id !== "string" || !/^([a-z0-9-]+:)?[1-9][0-9]*$/.test(value.id))
    invalidResponse();
  // Preserve a usable lease ID even if optional display metadata is missing, so cleanup can run.
  return { ...value, notice: typeof value.notice === "string" ? value.notice : undefined } as Lease;
}

export function screenText(value: unknown): ScreenText {
  if (
    !isRecord(value) ||
    !Array.isArray(value.lines) ||
    typeof value.width !== "number" ||
    typeof value.height !== "number"
  )
    invalidResponse();
  if (
    !value.lines.every(
      (line) =>
        isRecord(line) && typeof line.text === "string" && typeof line.x === "number" && typeof line.y === "number",
    )
  )
    invalidResponse();
  return value as ScreenText;
}

export function actionResult(value: unknown): Schemas["ActionResult"] {
  if (!isRecord(value) || typeof value.message !== "string") invalidResponse();
  return value as Schemas["ActionResult"];
}
