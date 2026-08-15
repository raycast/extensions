/**
 * Enumerates supported role types for browsing and storage.
 * - "New Grad"
 * - "Internship"
 */
export type RoleType = "New Grad" | "Internship";

/**
 * Enumerates the lifecycle states for a job/application entry.
 */
export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";

/**
 * Maps RoleType to its API segment path.
 */
const roleLinks: Record<RoleType, "jobs" | "internships"> = {
  "New Grad": "jobs",
  Internship: "internships",
};

/**
 * Converts a RoleType to the corresponding API segment ("jobs" or "internships").
 *
 * @param role_type - The role type to convert.
 * @returns API segment string.
 */
export function toApiSegment(role_type: RoleType): "jobs" | "internships" {
  return roleLinks[role_type];
}
