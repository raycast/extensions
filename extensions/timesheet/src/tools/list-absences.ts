import { getAbsences, getOrganizations } from "../api";

type Input = {
  /**
   * Only return absences in this organization. Omit to use the user's first organization.
   */
  organizationId?: string;
  /**
   * Only return absences in this state.
   */
  status?: "requested" | "approved" | "rejected" | "cancelled";
  /**
   * First day to include, as a date in YYYY-MM-DD format.
   */
  startDate?: string;
  /**
   * Last day to include, as a date in YYYY-MM-DD format.
   */
  endDate?: string;
};

function memberName(member?: {
  displayName?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
}): string | undefined {
  if (!member) return undefined;
  if (member.displayName && member.displayName.trim().length > 0) {
    return member.displayName;
  }
  const parts = [member.firstname, member.lastname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : member.email;
}

export default async function tool(input: Input) {
  let organizationId = input.organizationId;
  if (!organizationId) {
    const orgs = await getOrganizations();
    if (orgs.length === 0) {
      return {
        absences: [],
        note: "The user does not belong to an organization, so there are no absences to show.",
      };
    }
    organizationId = orgs[0].id;
  }

  const absences = await getAbsences(organizationId, {
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return {
    organizationId,
    absences: absences.map((absence) => ({
      id: absence.id,
      member: memberName(absence.member),
      type: absence.absenceType?.name,
      startDateTime: absence.startDateTime,
      endDateTime: absence.endDateTime,
      fullDay: absence.fullDay,
      totalDays: absence.totalDays,
      status: absence.status,
      reason: absence.reason,
    })),
  };
}
