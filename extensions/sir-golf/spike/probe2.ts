/**
 * Phase 0 follow-up probe — close two gaps:
 *  A) Capture the POPULATED (live/completed) competitor shape, since mid-week
 *     everything is "pre" and positions/thru/status are empty. Query a past
 *     tournament Sunday via ?dates=YYYYMMDD.
 *  B) Check whether the CHEAP default scoreboard (~37KB) already carries
 *     leagues[0].calendar (the season schedule) so "This Week" doesn't need the
 *     17MB ?dates=2026 payload.
 *
 * Run: npx tsx spike/probe2.ts
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";

async function get(url: string) {
  const t0 = Date.now();
  const res = await fetch(url);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, ms: Date.now() - t0, bytes: text.length, json };
}

function hr(s: string) {
  console.log("\n" + "=".repeat(72) + "\n" + s + "\n" + "=".repeat(72));
}

async function populatedShape() {
  hr("A. POPULATED COMPETITOR SHAPE — past completed events");
  // US Open final round 2026-06-21 (Sun); also a generic past Sunday for PGA + a
  // recent LPGA/EUR completed event. We just need one fully-populated event.
  const dates = [
    { tour: "pga", date: "20260621", note: "US Open final round (Sun)" },
    { tour: "pga", date: "20260615", note: "Canadian Open final round area" },
    { tour: "lpga", date: "20260621", note: "LPGA recent Sunday" },
    { tour: "eur", date: "20260621", note: "DP World recent Sunday" },
  ];
  for (const d of dates) {
    const url = `${BASE}/${d.tour}/scoreboard?dates=${d.date}`;
    const r = await get(url);
    const ev = r.json?.events?.[0];
    const comp = ev?.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    console.log(
      `\n[${d.tour} ${d.date}] ${d.note}\n  status=${r.status} ${r.ms}ms ${r.bytes}b — event="${ev?.name}" state=${ev?.status?.type?.state} competitors=${competitors.length}`
    );
    const c0 = competitors[0];
    if (c0) {
      console.log("  competitor[0] keys:", Object.keys(c0).join(", "));
      console.log("  FULL competitor[0]:", JSON.stringify(c0, null, 2).slice(0, 2600));
      // Also show competition-level status, which is where event clock/round lives.
      console.log("  competition.status:", JSON.stringify(comp?.status, null, 2));
    }
  }
}

async function cheapSchedule() {
  hr("B. DEFAULT SCOREBOARD — does it carry leagues[0].calendar (cheap schedule)?");
  const r = await get(`${BASE}/pga/scoreboard`);
  const cal = r.json?.leagues?.[0]?.calendar;
  console.log(`  default scoreboard: ${r.bytes}b ${r.ms}ms`);
  console.log(`  leagues[0].calendar present=${Array.isArray(cal)} length=${cal?.length ?? 0}`);
  if (Array.isArray(cal) && cal.length) {
    console.log("  calendar[0..2]:", JSON.stringify(cal.slice(0, 3), null, 2));
    // What's "this week" / "next"? Find the entry whose range spans today, or the next upcoming.
    const now = new Date().toISOString();
    const current = cal.find((c: any) => c.startDate <= now && now <= c.endDate);
    const next = cal.find((c: any) => c.startDate > now);
    console.log("  → current (spans now):", current ? `${current.label} (${current.startDate}..${current.endDate})` : "none");
    console.log("  → next upcoming:", next ? `${next.label} (${next.startDate})` : "none");
  }
  // Also: does the default scoreboard tell us the "active" event via season/week?
  console.log("  leagues[0].season:", JSON.stringify(r.json?.leagues?.[0]?.season));
}

async function main() {
  await populatedShape();
  await cheapSchedule();
  hr("DONE");
}
main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
