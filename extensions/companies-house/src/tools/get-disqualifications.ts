import {
  getDisqualifiedOfficer,
  parseDisqualificationLink,
  searchDisqualifiedOfficers,
} from "../api";
import {
  disqualificationActLabel,
  disqualificationEndLabel,
  disqualificationReasonLabel,
  disqualificationTypeLabel,
  formatAddress,
  formatDate,
} from "../helpers";

/** Detail lookups per call. Each match costs a request, so the tail is capped. */
const MAX_DETAILED_MATCHES = 5;

type Input = {
  /**
   * The person or company name to look up in the register of disqualified
   * directors, e.g. "Aaron Donald Smith". A name is the only way in: the
   * disqualification register uses its own officer ids, which are not the
   * officer ids returned by search-officers or get-officers, and an officer's
   * company record carries no link to a disqualification. Pass the officer's
   * name, never their officer id.
   */
  name: string;
};

/** Search the Companies House register of disqualified directors by name and return the disqualifications recorded against each match, with their dates, statutory reason, court and the companies named. The register holds only disqualifications currently in force, so no match is the ordinary result and does not mean the person has never been disqualified. A match is a match on a name and is not proof of identity: check the date of birth and address before treating a result as the same person. */
export default async function tool(input: Input) {
  const caveat =
    "Names in this register are not unique. Confirm the date of birth and address before treating a match as the same person, and treat no match as 'nothing recorded', not as a clean record.";

  const res = await searchDisqualifiedOfficers(input.name, 0);
  const items = res.items ?? [];

  if (!items.length) {
    return {
      total_matches: 0,
      matches: [],
      note: `No entry in the register of disqualified directors matches "${input.name}". The register holds only disqualifications currently in force, so this is the ordinary result. It is not a confirmation that the person has never been disqualified.`,
    };
  }

  const detailed = await Promise.all(
    items.slice(0, MAX_DETAILED_MATCHES).map(async (item) => {
      const target = parseDisqualificationLink(item.links?.self);
      const record = target
        ? await getDisqualifiedOfficer(target.register, target.officerId)
        : undefined;

      return {
        name: item.title,
        register: target?.register,
        born: formatDate(item.date_of_birth),
        address: item.address_snippet,
        nationality: record?.nationality,
        disqualifications: (record?.disqualifications ?? []).map((entry) => ({
          type: disqualificationTypeLabel(entry.disqualification_type),
          from: formatDate(entry.disqualified_from),
          // The register writes "9999-12-31" when there is no end date.
          until: disqualificationEndLabel(entry.disqualified_until),
          reason: disqualificationReasonLabel(
            entry.reason?.description_identifier,
          ),
          act: disqualificationActLabel(entry.reason?.act),
          section: entry.reason?.section,
          court: entry.court_name,
          heard: formatDate(entry.heard_on),
          undertaken: formatDate(entry.undertaken_on),
          case_reference: entry.case_identifier,
          address: formatAddress(entry.address),
          companies_named: entry.company_names ?? [],
        })),
      };
    }),
  );

  return {
    total_matches: res.total_results ?? items.length,
    detail_returned_for: detailed.length,
    matches: detailed,
    note: caveat,
  };
}
