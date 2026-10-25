import type { Candidate, ElectionSnapshot, ElectionSummary } from "./types";

// TSE's public results: a config that lists every election, and one results file per election.
const RESULTS_BASE = "https://resultados.tse.jus.br/oficial";
const CONFIG_URL = `${RESULTS_BASE}/comum/config/ele-c.json`;
const RESULTS_URL = `${RESULTS_BASE}/app/index.html`;

// Since 2022 every state votes 08:00–17:00 Brasília time. TSE's config gives only the date.
const POLLS_OPEN = "08:00:00";
const POLLS_CLOSE = "17:00:00";
const BRASILIA_OFFSET = "-03:00";

// The office code TSE gives the presidency, counted nationwide ("br").
const PRESIDENT = "1";

const PARTY_COLORS: Record<string, string> = { PT: "#C8102E", PL: "#1E5BA8" };
const FALLBACK_COLOR = "#8E8E93";

type TseConfig = {
  pl: { c: string; dt: string; e: { cd: string; t: string; abr?: { cd: string; cp?: { cd: string }[] }[] }[] }[];
};

type TseCandidate = { nmu: string; seq: string; e: string; st: string; vap: string; pvapn: string };
type TseParty = { sg: string; cand: TseCandidate[] };
type TseResponse = {
  t: string;
  dg: string;
  hg: string;
  tf: string;
  s: { pstn: string };
  carg: { agr: { par: TseParty[] }[] }[];
};

// TSE numbers come as strings with a decimal comma: "47,027772356".
function toNumber(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

// TSE dates and times ("24/10/2026", "19:19:13") are Brasília time. Returns an ISO timestamp.
function toIso(date: string, time: string): string {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}T${time}${BRASILIA_OFFSET}`;
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/(^|\s)\p{L}/gu, (char) => char.toUpperCase());
}

// Every presidential election in TSE's config, first round and runoff.
export async function fetchBrazilElections(): Promise<ElectionSummary[]> {
  const response = await fetch(CONFIG_URL);
  if (!response.ok) throw new Error(`TSE responded ${response.status}`);
  const config = (await response.json()) as TseConfig;

  return config.pl.flatMap((cycle) =>
    cycle.e
      .filter((e) => e.abr?.some((a) => a.cd === "br" && a.cp?.some((office) => office.cd === PRESIDENT)))
      .map((e) => ({
        id: `br:${e.cd}`,
        ref: `${cycle.c}/${e.cd}`,
        country: "Brazil",
        flag: "🇧🇷",
        title: `President · ${e.t === "2" ? "Runoff" : "First round"}`,
        pollsOpen: toIso(cycle.dt, POLLS_OPEN),
        pollsClose: toIso(cycle.dt, POLLS_CLOSE),
        timeZone: "America/Sao_Paulo",
        timeZoneLabel: "Brasília",
      })),
  );
}

export async function fetchBrazilPresident(election: ElectionSummary): Promise<ElectionSnapshot> {
  const [cycle, electionCode] = election.ref.split("/");
  const code = electionCode.padStart(6, "0");
  const response = await fetch(`${RESULTS_BASE}/${cycle}/${electionCode}/dados/br/br-c0001-e${code}-u.json`);
  if (!response.ok) throw new Error(`TSE responded ${response.status}`);
  const data = (await response.json()) as TseResponse;

  // Before counting starts every candidate has 0 votes, so fall back to TSE's ballot order.
  const entries = data.carg[0].agr.flatMap((group) =>
    group.par.flatMap((party) =>
      party.cand.map((candidate) => {
        const name = titleCase(candidate.nmu);
        const parsed: Candidate = {
          name,
          shortName: name.split(" ").pop() ?? name,
          party: party.sg,
          color: PARTY_COLORS[party.sg] ?? FALLBACK_COLOR,
          votes: toNumber(candidate.vap),
          percent: toNumber(candidate.pvapn),
          // TSE marks e = "s" for both runoff candidates too. Only st says "Eleito" for a winner.
          elected: candidate.e === "s" && /^eleit[oa]$/i.test(candidate.st),
        };
        return { candidate: parsed, seq: Number(candidate.seq) };
      }),
    ),
  );
  entries.sort((a, b) => b.candidate.votes - a.candidate.votes || a.seq - b.seq);

  return {
    ...election,
    reportingPercent: toNumber(data.s.pstn),
    candidates: entries.map((entry) => entry.candidate),
    finished: data.tf === "s",
    updatedAt: toIso(data.dg, data.hg),
    resultsUrl: RESULTS_URL,
  };
}
