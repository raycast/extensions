import { searchOfficers } from "../api";
import { extractOfficerId, formatDateOfBirth } from "../helpers";

type Input = {
  /** The officer or director name to search for, e.g. "John Smith". A surname on its own works and returns more matches. */
  query: string;
};

/** Search Companies House for company officers and directors by name. Returns each match with an officer_id that can be passed to get-officer-appointments. */
export default async function tool(input: Input) {
  const res = await searchOfficers(input.query, 0);
  return {
    total: res.total_results,
    returned: res.items?.length ?? 0,
    officers: (res.items ?? []).map((officer) => ({
      name: officer.title,
      officer_id: extractOfficerId(officer.links?.self),
      appointments: officer.appointment_count,
      born: formatDateOfBirth(officer.date_of_birth),
      address: officer.address_snippet,
    })),
  };
}
