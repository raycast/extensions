import { type AuditStatus } from "../shared";
import { type SkillAuditsAvailabilityState } from "./skill-audits";

const AUDIT_STATUS_META: Record<AuditStatus, { emoji: string; label: string }> = {
  pass: { emoji: "✅", label: "Pass" },
  warn: { emoji: "⚠️", label: "Warn" },
  fail: { emoji: "🛑", label: "Fail" },
  unknown: { emoji: "", label: "Unknown" },
};

export function formatAuditStatus(status: AuditStatus): string {
  const { emoji, label } = AUDIT_STATUS_META[status];
  return emoji ? `${emoji} ${label}` : label;
}

export function getAuditFallbackText(isLoading: boolean, availabilityState?: SkillAuditsAvailabilityState): string {
  if (isLoading) return "Loading...";
  if (availabilityState === "parse-error" || availabilityState === "fetch-error") return "Unable to verify";
  return "Pending";
}
