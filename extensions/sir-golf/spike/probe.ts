/**
 * Phase 0 data spike — ESPN unofficial golf API prober.
 *
 * Throwaway script. Goal: prove (or disprove) that a Raycast golf extension
 * can render a live leaderboard + schedule reliably, at $0, with no key.
 *
 * Run: npx tsx spike/probe.ts
 *
 * It hits ESPN's site.api.espn.com golf endpoints with a PLAIN fetch (no
 * headers, no auth) and reports:
 *   - which tours return data (pga / lpga / eur / champions-tour / liv)
 *   - the JSON paths to the fields we'd render
 *   - off-season / no-live-event behaviour (via ?dates= on a quiet day)
 *   - rate-limiting on ~20 rapid calls
 *   - cross-tour shape consistency
 *   - schedule endpoint shape
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";
const TOURS = ["pga", "lpga", "eur", "champions-tour", "liv"];

type FetchResult = {
  ok: boolean;
  status: number;
  ms: number;
  bytes: number;
  json?: any;
  err?: string;
};

async function get(url: string): Promise<FetchResult> {
  const t0 = Date.now();
  try {
    // PLAIN fetch — deliberately no headers / no user-agent / no auth.
    const res = await fetch(url);
    const text = await res.text();
    const ms = Date.now() - t0;
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    return { ok: res.ok, status: res.status, ms, bytes: text.length, json };
  } catch (e: any) {
    return { ok: false, status: 0, ms: Date.now() - t0, bytes: 0, err: String(e?.message ?? e) };
  }
}

function hr(label: string) {
  console.log("\n" + "=".repeat(72) + "\n" + label + "\n" + "=".repeat(72));
}

// Pull the fields we'd actually render off a scoreboard payload.
function summarizeScoreboard(json: any) {
  const events = json?.events ?? [];
  const out: any = {
    leagueName: json?.leagues?.[0]?.name,
    season: json?.season,
    eventCount: events.length,
    events: [],
  };
  for (const ev of events) {
    const comp = ev?.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const sample = competitors.slice(0, 3).map((c: any) => ({
      position: c?.status?.position?.displayName ?? c?.order,
      player: c?.athlete?.displayName,
      total: c?.score ?? c?.statistics?.find((s: any) => s.name === "scoreToPar")?.displayValue,
      thru: c?.status?.thru ?? c?.status?.displayValue,
      statusState: c?.status?.type?.state ?? ev?.status?.type?.state,
    }));
    out.events.push({
      name: ev?.name,
      shortName: ev?.shortName,
      date: ev?.date,
      eventStatusState: ev?.status?.type?.state,
      eventStatusDetail: ev?.status?.type?.detail ?? ev?.status?.type?.description,
      competitorCount: competitors.length,
      sampleCompetitors: sample,
    });
  }
  return out;
}

async function probeTours() {
  hr("1. TOUR COVERAGE — plain fetch, no headers, /{tour}/scoreboard");
  const coverage: Record<string, any> = {};
  for (const tour of TOURS) {
    const url = `${BASE}/${tour}/scoreboard`;
    const r = await get(url);
    coverage[tour] = r;
    console.log(
      `\n[${tour}] ${url}\n  status=${r.status} ok=${r.ok} ${r.ms}ms ${r.bytes}b ${r.err ?? ""}`
    );
    if (r.json) {
      const s = summarizeScoreboard(r.json);
      console.log(
        `  league="${s.leagueName}" season=${JSON.stringify(s.season)} events=${s.eventCount}`
      );
      for (const ev of s.events) {
        console.log(
          `   • "${ev.name}" [${ev.eventStatusState}] ${ev.eventStatusDetail ?? ""} — ${ev.competitorCount} competitors`
        );
        for (const c of ev.sampleCompetitors) {
          console.log(
            `      pos=${c.position} player=${c.player} total=${c.total} thru=${c.thru} state=${c.statusState}`
          );
        }
      }
    }
  }
  return coverage;
}

async function probeFieldPaths() {
  hr("2. FIELD PATHS — full first-competitor object (pga), to nail JSON paths");
  const r = await get(`${BASE}/pga/scoreboard`);
  const comp = r.json?.events?.[0]?.competitions?.[0];
  const c0 = comp?.competitors?.[0];
  if (!c0) {
    console.log("  No live competitor to introspect (no active PGA event right now).");
    return;
  }
  console.log("  competitor[0] keys:", Object.keys(c0));
  console.log("  competitor[0].status:", JSON.stringify(c0.status, null, 2));
  console.log("  competitor[0].athlete (trimmed):", JSON.stringify({
    displayName: c0.athlete?.displayName,
    shortName: c0.athlete?.shortName,
    flag: c0.athlete?.flag?.href,
  }, null, 2));
  console.log("  competitor[0].score:", JSON.stringify(c0.score));
  console.log("  competitor[0].statistics:", JSON.stringify(c0.statistics, null, 2));
  console.log("  competitor[0].linescores (rounds):", JSON.stringify(c0.linescores?.slice?.(0, 2), null, 2));
}

async function probeOffSeason() {
  hr("3. OFF-SEASON / NO-LIVE-EVENT — ?dates= on a quiet day + a winter month");
  // Mondays mid-season + deep off-season. ESPN scoreboard accepts ?dates=YYYYMMDD and ?dates=YYYY (season).
  const probes = [
    { label: "single quiet weekday (Mon 2026-01-05, off-season)", url: `${BASE}/pga/scoreboard?dates=20260105` },
    { label: "deep winter (2025-12-25)", url: `${BASE}/pga/scoreboard?dates=20251225` },
    { label: "far-future date no event (2027-07-05)", url: `${BASE}/pga/scoreboard?dates=20270705` },
  ];
  for (const p of probes) {
    const r = await get(p.url);
    console.log(`\n[${p.label}]\n  ${p.url}\n  status=${r.status} ok=${r.ok} ${r.ms}ms`);
    if (r.json) {
      const s = summarizeScoreboard(r.json);
      console.log(`  events=${s.eventCount}`);
      for (const ev of s.events) {
        console.log(`   • "${ev.name}" [${ev.eventStatusState}] competitors=${ev.competitorCount}`);
      }
      if (s.eventCount === 0) console.log("  → returns 200 with EMPTY events[] (graceful, not a 404)");
    } else {
      console.log("  → non-JSON / error body:", r.err);
    }
  }
}

async function probeSchedule() {
  hr("4. SCHEDULE ENDPOINT — upcoming tournaments");
  // Two candidates to verify.
  const candidates = [
    `${BASE}/pga/scoreboard?dates=2026`, // season-range on scoreboard
    `https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=2026`,
    `${BASE}/pga/schedule`,
  ];
  for (const url of candidates) {
    const r = await get(url);
    console.log(`\n${url}\n  status=${r.status} ok=${r.ok} ${r.ms}ms ${r.bytes}b ${r.err ?? ""}`);
    if (r.json) {
      const evs = r.json?.events ?? r.json?.leagues?.[0]?.calendar ?? [];
      console.log(`  events/calendar length=${Array.isArray(evs) ? evs.length : "n/a"}`);
      if (Array.isArray(evs) && evs.length) {
        const sample = evs.slice(0, 5).map((e: any) =>
          e?.name
            ? { name: e.name, date: e.date, state: e?.status?.type?.state }
            : { label: e?.label ?? e?.value, startDate: e?.startDate, endDate: e?.endDate }
        );
        console.log("  sample:", JSON.stringify(sample, null, 2));
      }
      // Also surface the league calendar which often lists the whole season schedule.
      const cal = r.json?.leagues?.[0]?.calendar;
      if (Array.isArray(cal) && cal.length) {
        console.log(`  leagues[0].calendar length=${cal.length} (season schedule candidate)`);
        console.log("  calendar sample:", JSON.stringify(cal.slice(0, 3), null, 2));
      }
    }
  }
}

async function probeRateLimit() {
  hr("5. RATE LIMIT — 20 rapid sequential calls to /pga/scoreboard");
  const url = `${BASE}/pga/scoreboard`;
  const results: FetchResult[] = [];
  for (let i = 0; i < 20; i++) {
    const r = await get(url);
    results.push(r);
    process.stdout.write(`${r.status}${r.ok ? "" : "!"} `);
  }
  console.log("");
  const statuses = results.reduce((acc: Record<number, number>, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const times = results.map((r) => r.ms);
  console.log(`  status histogram: ${JSON.stringify(statuses)}`);
  console.log(
    `  latency ms: min=${Math.min(...times)} max=${Math.max(...times)} avg=${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}`
  );
  const throttled = results.some((r) => r.status === 429 || r.status === 403);
  console.log(`  → ${throttled ? "THROTTLING DETECTED" : "no 429/403 — no throttling on 20 calls"}`);
}

async function probeShapeConsistency(coverage: Record<string, any>) {
  hr("6. CROSS-TOUR SHAPE CONSISTENCY — can one parser serve all live tours?");
  const live = Object.entries(coverage).filter(
    ([, r]: any) => r.json?.events?.length
  );
  if (live.length < 1) {
    console.log("  No tours have live events right now; re-run during a tournament for a full check.");
  }
  for (const [tour, r] of Object.entries(coverage)) {
    const c0 = (r as any)?.json?.events?.[0]?.competitions?.[0]?.competitors?.[0];
    if (!c0) {
      console.log(`  [${tour}] no competitors to compare`);
      continue;
    }
    console.log(`  [${tour}] competitor keys: ${Object.keys(c0).join(", ")}`);
    console.log(
      `    has athlete.displayName=${!!c0.athlete?.displayName} status.position=${!!c0.status?.position} score=${c0.score !== undefined} statistics=${Array.isArray(c0.statistics)}`
    );
  }
}

async function main() {
  console.log(`ESPN golf API probe — ${new Date().toISOString()}`);
  console.log(`BASE=${BASE}`);
  const coverage = await probeTours();
  await probeFieldPaths();
  await probeOffSeason();
  await probeSchedule();
  await probeRateLimit();
  await probeShapeConsistency(coverage);
  hr("DONE");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
