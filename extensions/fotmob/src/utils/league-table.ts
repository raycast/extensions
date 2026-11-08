import type { DisplayableTable, LeagueDetailData, LeagueTableTeam } from "@/types/league-detail";

type Legend = NonNullable<DisplayableTable["legend"]>;

// Row shape FotMob's league pages send since late 2026: points as `pts`,
// goals as a "for-against" string, goal difference as `goalConDiff`.
type FotmobTableRow = Partial<LeagueTableTeam> & {
  pts?: number;
  scoresStr?: string;
  goalConDiff?: number | string;
};

type FotmobTableData = {
  leagueName?: string;
  legend?: Legend;
  table?: { all?: FotmobTableRow[] };
  tables?: FotmobTableData[];
};

function toTeam(row: FotmobTableRow, index: number): LeagueTableTeam {
  const [scoresFor, scoresAgainst] = String(row.scoresStr ?? "")
    .split("-")
    .map(Number);
  const goalDifference = Number(row.goalConDiff ?? row.goalDifference);
  return {
    ...row,
    id: row.id ?? 0,
    name: row.name ?? "",
    shortName: row.shortName ?? row.name ?? "",
    played: row.played ?? 0,
    wins: row.wins ?? 0,
    draws: row.draws ?? 0,
    losses: row.losses ?? 0,
    points: row.points ?? row.pts ?? 0,
    scoresFor: row.scoresFor ?? (Number.isFinite(scoresFor) ? scoresFor : 0),
    scoresAgainst: row.scoresAgainst ?? (Number.isFinite(scoresAgainst) ? scoresAgainst : 0),
    goalDifference: Number.isFinite(goalDifference) ? goalDifference : 0,
    idx: row.idx ?? index + 1,
  };
}

function fromCurrentShape(entries: unknown[]): DisplayableTable[] {
  const result: DisplayableTable[] = [];
  const add = (name: string | undefined, rows: FotmobTableRow[] | undefined, legend: Legend | undefined) => {
    if (!rows || rows.length === 0) return;
    result.push({ tableName: name || "League Table", teams: rows.map(toTeam), legend });
  };
  for (const entry of entries) {
    const data = (entry as { data?: FotmobTableData } | null)?.data;
    if (!data) continue;
    add(data.leagueName, data.table?.all, data.legend);
    // Composite competitions (e.g. group stages) carry one table per group.
    for (const group of data.tables ?? []) {
      add(group.leagueName, group.table?.all, group.legend ?? data.legend);
    }
  }
  return result;
}

function fromLegacyShape(tables: unknown, legend: Legend | undefined): DisplayableTable[] {
  if (!Array.isArray(tables)) return [];
  return tables.map((table: { tableName?: string; tableRows?: FotmobTableRow[] }) => ({
    tableName: table.tableName || "League Table",
    teams: (table.tableRows ?? []).map(toTeam),
    legend,
  }));
}

/**
 * Pulls the standings out of a league page's props. FotMob replaced
 * `overview.table.tables[].tableRows` with `overview.table[].data.table.all`;
 * both shapes are read so cached data from either still renders.
 */
export function extractDisplayableTables(data: LeagueDetailData | undefined): DisplayableTable[] {
  if (!data) return [];
  const overviewTable: unknown = data.overview?.table;
  const table: unknown = data.table;

  if (Array.isArray(overviewTable)) {
    const tables = fromCurrentShape(overviewTable);
    if (tables.length > 0) return tables;
  } else if (overviewTable && typeof overviewTable === "object") {
    const legacy = overviewTable as { tables?: unknown; legend?: Legend };
    const tables = fromLegacyShape(legacy.tables, legacy.legend);
    if (tables.length > 0) return tables;
  }

  if (Array.isArray(table) && table.length > 0) {
    const current = fromCurrentShape(table);
    if (current.length > 0) return current;
    return table.flatMap((entry: { tables?: unknown; legend?: Legend }) =>
      fromLegacyShape(entry?.tables, entry?.legend),
    );
  }

  return [];
}
