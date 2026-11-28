import type { TuckStatus } from "./client"

export function receiptLabel(status: TuckStatus): string {
  if (status === "filed") return "Tucked"
  if (status === "queued") return "Waiting until Tuck is unlocked"
  return "Sent to your inbox"
}

export function failureLabel(reason: "unauthorized" | "offline" | "bad" | "rejected", error?: string): string {
  if (reason === "unauthorized") return "That pair link was refused. Copy a new one from the Tuck menu."
  if (reason === "offline") return "Open Tuck on this Mac"
  if (reason === "rejected") return error?.trim() || "Nothing to tuck"
  return "Tuck could not file that"
}
