/**
 * The two filters CourtListener's search takes that are worth putting in front of you: which court
 * decided the case, and how far back to look. Everything here is presentational or param-shaped —
 * the request builder takes the ids and dates as they come out.
 */

/** Sentinel for "don't send this param", since a Raycast dropdown needs a non-empty value. */
export const ANY = "any";

export interface Court {
  id: string;
  title: string;
}

/** CourtListener takes several ids at once, comma-separated. */
export const ALL_CIRCUITS = ["ca1", "ca2", "ca3", "ca4", "ca5", "ca6", "ca7", "ca8", "ca9", "ca10", "ca11", "cadc"]
  .concat("cafc")
  .join(",");

export const CIRCUITS: Court[] = [
  { id: "ca1", title: "1st Circuit" },
  { id: "ca2", title: "2nd Circuit" },
  { id: "ca3", title: "3rd Circuit" },
  { id: "ca4", title: "4th Circuit" },
  { id: "ca5", title: "5th Circuit" },
  { id: "ca6", title: "6th Circuit" },
  { id: "ca7", title: "7th Circuit" },
  { id: "ca8", title: "8th Circuit" },
  { id: "ca9", title: "9th Circuit" },
  { id: "ca10", title: "10th Circuit" },
  { id: "ca11", title: "11th Circuit" },
  { id: "cadc", title: "D.C. Circuit" },
  { id: "cafc", title: "Federal Circuit" },
];

export const FEDERAL_COURTS: Court[] = [
  { id: "scotus", title: "Supreme Court" },
  { id: ALL_CIRCUITS, title: "All Circuits" },
  ...CIRCUITS,
];

/**
 * State courts of last resort, from `/api/rest/v4/courts/?jurisdiction=S`, minus the historical
 * ones the endpoint still lists (Kentucky's pre-1976 appeals court, the Dakota Territory supreme
 * court, New York's Court of Chancery). Hard-coded rather than fetched: the list of state supreme
 * courts is about as stable as data gets, and a request spent on it is a search not run. There is
 * no "all state courts" option: CourtListener asks that queries not carry many alternatives at
 * once, and 52 court ids in one request is exactly that.
 */
export const STATE_COURTS: Court[] = [
  { id: "ala", title: "Alabama" },
  { id: "alaska", title: "Alaska" },
  { id: "ariz", title: "Arizona" },
  { id: "ark", title: "Arkansas" },
  { id: "cal", title: "California" },
  { id: "colo", title: "Colorado" },
  { id: "conn", title: "Connecticut" },
  { id: "del", title: "Delaware" },
  { id: "dc", title: "District of Columbia" },
  { id: "fla", title: "Florida" },
  { id: "ga", title: "Georgia" },
  { id: "haw", title: "Hawaii" },
  { id: "idaho", title: "Idaho" },
  { id: "ill", title: "Illinois" },
  { id: "ind", title: "Indiana" },
  { id: "iowa", title: "Iowa" },
  { id: "kan", title: "Kansas" },
  { id: "ky", title: "Kentucky" },
  { id: "la", title: "Louisiana" },
  { id: "me", title: "Maine" },
  { id: "md", title: "Maryland" },
  { id: "mass", title: "Massachusetts" },
  { id: "mich", title: "Michigan" },
  { id: "minn", title: "Minnesota" },
  { id: "miss", title: "Mississippi" },
  { id: "mo", title: "Missouri" },
  { id: "mont", title: "Montana" },
  { id: "neb", title: "Nebraska" },
  { id: "nev", title: "Nevada" },
  { id: "nh", title: "New Hampshire" },
  { id: "nj", title: "New Jersey" },
  { id: "nm", title: "New Mexico" },
  { id: "ny", title: "New York" },
  { id: "nc", title: "North Carolina" },
  { id: "nd", title: "North Dakota" },
  { id: "ohio", title: "Ohio" },
  { id: "okla", title: "Oklahoma" },
  { id: "or", title: "Oregon" },
  { id: "pa", title: "Pennsylvania" },
  { id: "ri", title: "Rhode Island" },
  { id: "sc", title: "South Carolina" },
  { id: "sd", title: "South Dakota" },
  { id: "tenn", title: "Tennessee" },
  { id: "tex", title: "Texas" },
  { id: "texcrimapp", title: "Texas Court of Criminal Appeals" },
  { id: "utah", title: "Utah" },
  { id: "vt", title: "Vermont" },
  { id: "va", title: "Virginia" },
  { id: "wash", title: "Washington" },
  { id: "wva", title: "West Virginia" },
  { id: "wis", title: "Wisconsin" },
  { id: "wyo", title: "Wyoming" },
];

export function courtTitle(id: string): string {
  if (id === ALL_CIRCUITS) {
    return "All Circuits";
  }
  return [...FEDERAL_COURTS, ...STATE_COURTS].find((court) => court.id === id)?.title ?? "All Courts";
}

export interface DateRange {
  /** Dropdown value, and the sentinel when no date filter applies. */
  id: string;
  title: string;
  /** ISO date for `filed_after`, resolved when the range is chosen. */
  from: () => string;
}

function yearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export const DATE_RANGES: DateRange[] = [
  { id: ANY, title: "Any Time", from: () => "" },
  { id: "1y", title: "Past Year", from: () => yearsAgo(1) },
  { id: "5y", title: "Past 5 Years", from: () => yearsAgo(5) },
  { id: "10y", title: "Past 10 Years", from: () => yearsAgo(10) },
  { id: "2000", title: "Since 2000", from: () => "2000-01-01" },
];

export function dateRangeTitle(id: string): string {
  return DATE_RANGES.find((range) => range.id === id)?.title ?? "Any Time";
}
