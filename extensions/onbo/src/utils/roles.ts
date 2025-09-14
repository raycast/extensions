export type RoleType = "New Grad" | "Internship";

export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";

const roleLinks: Record<RoleType, "jobs" | "internships"> = {
  "New Grad": "jobs",
  Internship: "internships",
};

export function toApiSegment(role_type: RoleType): "jobs" | "internships" {
  return roleLinks[role_type];
}
