import { Color, Icon, Image } from "@raycast/api";
import { format } from "date-fns";
import { Match, Person, Statistic, Team, Translations } from "../types";

export const t = (
  translations: Translations | undefined,
  key: string,
  fallback = "",
): string => translations?.[key]?.EN ?? fallback;

export const teamName = (team?: Team): string =>
  t(team?.translations, "displayName", team?.internationalName ?? "TBD");

export const playerName = (person?: Person): string =>
  t(
    person?.translations,
    "name",
    person?.internationalName ?? person?.clubShirtName ?? "Unknown",
  );

export const teamLogo = (team?: Team): Image.ImageLike => ({
  source: team?.mediumLogoUrl || team?.logoUrl || Icon.Shield,
  fallback: Icon.Shield,
});

export const playerImage = (person?: Person): Image.ImageLike => ({
  source: person?.imageUrl || Icon.Person,
  fallback: Icon.Person,
});

export const LIVE_STATUSES = ["LIVE"];

export const isLive = (match: Match): boolean =>
  LIVE_STATUSES.includes(match.status);
export const isFinished = (match: Match): boolean =>
  match.status === "FINISHED";
export const isUpcoming = (match: Match): boolean =>
  match.status === "UPCOMING";

/** True when UEFA has published an exact kick-off time, not just the date. */
export const hasKickoffTime = (match: Match): boolean =>
  Boolean(match.kickOffTime?.dateTime);

/**
 * Kick-off as a Date. Falls back to the published date (noon UTC, so it lands on
 * the same calendar day everywhere in Europe) when the exact time isn't known yet.
 */
export const kickoff = (match: Match): Date | undefined => {
  if (match.kickOffTime?.dateTime) return new Date(match.kickOffTime.dateTime);
  if (match.kickOffTime?.date)
    return new Date(`${match.kickOffTime.date}T12:00:00Z`);
  return undefined;
};

const TIME_TOKENS = /[HhmaKk]/;

export const formatKickoff = (
  match: Match,
  pattern = "EEE d MMM yyyy, HH:mm",
): string => {
  const date = kickoff(match);
  if (!date) return "TBC";
  if (hasKickoffTime(match)) return format(date, pattern);
  // Date known, time not: keep the date parts of the pattern and mark the time TBC.
  const datePart = pattern
    .split(/,?\s+/)
    .filter((token) => !TIME_TOKENS.test(token))
    .join(" ");
  if (!datePart) return "TBC";
  return pattern === datePart
    ? format(date, datePart)
    : `${format(date, datePart)}, TBC`;
};

export const formatDate = (
  iso: string | undefined,
  pattern = "d MMM yyyy",
): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? undefined : format(date, pattern);
};

/** "45+2'" style clock for live matches. */
export const liveClock = (match: Match): string => {
  if (match.phase === "HALF_TIME_BREAK") return "HT";
  if (match.phase === "EXTRA_TIME_BREAK") return "ET Break";
  if (match.phase === "PENALTY") return "Pens";
  const { normal, injury } = match.minute ?? {};
  if (normal === undefined) return "Live";
  return injury ? `${normal}+${injury}'` : `${normal}'`;
};

export const scoreline = (match: Match): string => {
  const total = match.score?.total;
  if (!total || isUpcoming(match)) return "vs";
  let text = `${total.home} - ${total.away}`;
  if (match.score?.penalty) {
    text += ` (${match.score.penalty.home}-${match.score.penalty.away} pens)`;
  }
  return text;
};

export const matchTitle = (match: Match): string =>
  `${teamName(match.homeTeam)} ${scoreline(match)} ${teamName(match.awayTeam)}`;

export const roundLabel = (match: Match): string => {
  const round = t(
    match.round?.translations,
    "name",
    match.round?.metaData?.name ?? "",
  );
  if (
    match.matchday?.longName &&
    match.round?.metaData?.type === "GROUP_STANDINGS"
  ) {
    const group = match.group?.metaData?.groupName;
    const prefix = group && group !== "League" ? `${group} · ` : "";
    return `${prefix}${match.matchday.longName}`;
  }
  return match.leg?.number ? `${round} · Leg ${match.leg.number}` : round;
};

export const stadiumName = (match: Match): string | undefined =>
  t(match.stadium?.translations, "name") ||
  t(match.stadium?.translations, "officialName") ||
  undefined;

export const cityName = (match: Match): string | undefined =>
  t(match.stadium?.city?.translations, "name") || undefined;

export const matchStatusIcon = (match: Match): Image.ImageLike => {
  if (isLive(match)) return { source: Icon.Livestream, tintColor: Color.Red };
  if (isFinished(match))
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (
    ["POSTPONED", "CANCELED", "ABANDONED", "SUSPENDED"].includes(match.status)
  ) {
    return { source: Icon.XMarkCircle, tintColor: Color.Orange };
  }
  return Icon.Calendar;
};

export const matchUrl = (match: Match): string =>
  `https://www.uefa.com/uefachampionsleague/match/${match.id}/`;

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const clubUrl = (team: Team): string =>
  `https://www.uefa.com/uefachampionsleague/clubs/${team.id}--${slug(team.internationalName)}/`;

export const playerUrl = (person: Person): string =>
  `https://www.uefa.com/uefachampionsleague/clubs/players/${person.id}--${slug(person.internationalName ?? "")}/`;

/** Season year → "2026/27" label. UEFA's seasonYear is the year the season ends. */
export const seasonLabel = (seasonYear: string, shortName?: string): string => {
  const match = shortName?.match(/(\d{4})\/(\d{2,4})/);
  if (match) return `${match[1]}/${match[2].slice(-2)}`;
  // Early European Cup seasons are named after the year of the final, e.g. "ECCC 1956".
  const finalYear = shortName?.match(/(\d{4})$/)?.[1];
  const end = Number(finalYear ?? seasonYear);
  return `${end - 1}/${String(end % 100).padStart(2, "0")}`;
};

export const statValue = (
  stats: Statistic[] | undefined,
  name: string,
): string | undefined => stats?.find((s) => s.name === name)?.value;

export const statLabel = (stat: Statistic): string =>
  t(stat.translations, "name", stat.name.replace(/_/g, " "));

export const getFlagEmoji = (countryCode?: string): string => {
  if (!countryCode) return "🏳️";
  const special: Record<string, string> = {
    ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    NIR: "🇬🇧",
  };
  if (special[countryCode]) return special[countryCode];
  const iso2 =
    ISO3_TO_ISO2[countryCode] ??
    (countryCode.length === 2 ? countryCode : undefined);
  if (!iso2) return "🏳️";
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

/** UEFA uses FIFA-style 3-letter codes; map the ones that appear in UEFA competitions and beyond. */
const ISO3_TO_ISO2: Record<string, string> = {
  ALB: "AL",
  ALG: "DZ",
  AND: "AD",
  ANG: "AO",
  ARG: "AR",
  ARM: "AM",
  AUS: "AU",
  AUT: "AT",
  AZE: "AZ",
  BEL: "BE",
  BEN: "BJ",
  BFA: "BF",
  BIH: "BA",
  BLR: "BY",
  BOL: "BO",
  BRA: "BR",
  BUL: "BG",
  CAN: "CA",
  CHI: "CL",
  CHN: "CN",
  CIV: "CI",
  CMR: "CM",
  COD: "CD",
  COL: "CO",
  CPV: "CV",
  CRC: "CR",
  CRO: "HR",
  CUW: "CW",
  CYP: "CY",
  CZE: "CZ",
  DEN: "DK",
  ECU: "EC",
  EGY: "EG",
  ESP: "ES",
  EST: "EE",
  FIN: "FI",
  FRA: "FR",
  FRO: "FO",
  GAB: "GA",
  GAM: "GM",
  GEO: "GE",
  GER: "DE",
  GHA: "GH",
  GIB: "GI",
  GNB: "GW",
  GRE: "GR",
  GUI: "GN",
  HAI: "HT",
  HON: "HN",
  HUN: "HU",
  IRL: "IE",
  IRN: "IR",
  IRQ: "IQ",
  ISL: "IS",
  ISR: "IL",
  ITA: "IT",
  JAM: "JM",
  JPN: "JP",
  KAZ: "KZ",
  KEN: "KE",
  KOR: "KR",
  KOS: "XK",
  KSA: "SA",
  LIE: "LI",
  LTU: "LT",
  LUX: "LU",
  LVA: "LV",
  MAR: "MA",
  MDA: "MD",
  MEX: "MX",
  MKD: "MK",
  MLI: "ML",
  MLT: "MT",
  MNE: "ME",
  MOZ: "MZ",
  NED: "NL",
  NGA: "NG",
  NOR: "NO",
  NZL: "NZ",
  PAN: "PA",
  PAR: "PY",
  PER: "PE",
  POL: "PL",
  POR: "PT",
  QAT: "QA",
  ROU: "RO",
  RSA: "ZA",
  RUS: "RU",
  SEN: "SN",
  SLE: "SL",
  SMR: "SM",
  SRB: "RS",
  SUI: "CH",
  SUR: "SR",
  SVK: "SK",
  SVN: "SI",
  SWE: "SE",
  SYR: "SY",
  TOG: "TG",
  TUN: "TN",
  TUR: "TR",
  UKR: "UA",
  URU: "UY",
  USA: "US",
  UZB: "UZ",
  VEN: "VE",
  ZAM: "ZM",
  ZIM: "ZW",
};

export const POSITIONS = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];

export const positionLabel = (position?: string): string =>
  position ? position.charAt(0) + position.slice(1).toLowerCase() : "Unknown";

export const groupByDay = (matches: Match[]) => {
  const groups = new Map<string, Match[]>();
  for (const match of matches) {
    const day = formatKickoff(match, "EEEE d MMMM yyyy");
    groups.set(day, [...(groups.get(day) ?? []), match]);
  }
  return [...groups.entries()];
};

/* -------------------------------------------------------------------------- */
/*                                   Finals                                   */
/* -------------------------------------------------------------------------- */

export const finalWinner = (final: Match): Team | undefined =>
  final.winner?.match?.team ?? final.winner?.aggregate?.team;

export const finalLoser = (final: Match): Team | undefined => {
  const winner = finalWinner(final);
  if (!winner) return undefined;
  return final.homeTeam.id === winner.id ? final.awayTeam : final.homeTeam;
};

/**
 * One deciding final per season. The 1974 final was drawn and replayed, so the
 * undecided first match is dropped in favour of the replay that has a winner.
 */
export const decidingFinals = (finals: Match[]): Match[] => {
  const bySeason = new Map<string, Match>();
  for (const final of finals) {
    const existing = bySeason.get(final.seasonYear);
    if (!existing || (finalWinner(final) && !finalWinner(existing))) {
      bySeason.set(final.seasonYear, final);
    }
  }
  return [...bySeason.values()];
};
