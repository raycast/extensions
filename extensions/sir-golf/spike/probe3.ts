/**
 * Phase 0 probe #3 — feasibility of the richer feature set:
 *   - tournament logos
 *   - event DETAIL: venue/course, field (who's playing), tee/qualifying times
 *   - season scoreboard (FedExCup-style standings)
 *   - scoring-averages / stats leaders
 *   - "most recent completed event" fallback for a useful off-season leaderboard
 *
 * Run: npx tsx spike/probe3.ts
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";
const CORE = "http://sports.core.api.espn.com/v2/sports/golf/leagues";

async function get(url: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(url);
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, ms: Date.now() - t0, bytes: text.length, json };
  } catch (e: any) {
    return { status: 0, ms: Date.now() - t0, bytes: 0, err: String(e?.message ?? e) };
  }
}
function hr(s: string) {
  console.log("\n" + "=".repeat(72) + "\n" + s + "\n" + "=".repeat(72));
}
function keys(o: any) {
  return o && typeof o === "object" ? Object.keys(o).join(", ") : String(o);
}

async function main() {
  // ---- get current + most-recent-completed event ids from the calendar ----
  const sb = await get(`${BASE}/pga/scoreboard`);
  const ev = sb.json?.events?.[0];
  const cal: any[] = sb.json?.leagues?.[0]?.calendar ?? [];
  const now = new Date().toISOString();
  const lastCompleted = [...cal].reverse().find((c) => c.endDate && c.endDate < now);
  const currentId = ev?.id;
  const lastId = lastCompleted?.id;
  console.log(`current event: ${ev?.name} id=${currentId} state=${ev?.status?.type?.state}`);
  console.log(`last completed (calendar): ${lastCompleted?.label} id=${lastId} ended=${lastCompleted?.endDate}`);

  // ---- logos / venue / tee times on the scoreboard itself ----
  hr("A. LOGOS / VENUE / TEE-TIME on scoreboard event");
  const comp = ev?.competitions?.[0];
  console.log("event keys:", keys(ev));
  console.log("event.logo:", JSON.stringify(ev?.logo ?? ev?.logos));
  console.log("competition keys:", keys(comp));
  console.log("competition.venue:", JSON.stringify(comp?.venue, null, 2));
  console.log("competition.course / .courses:", JSON.stringify(comp?.course ?? comp?.courses, null, 2)?.slice(0, 1200));
  const c0 = comp?.competitors?.[0];
  console.log("competitor[0] keys:", keys(c0));
  console.log("competitor[0].teeTime / .status:", JSON.stringify({ teeTime: c0?.teeTime, status: c0?.status }, null, 2));
  console.log("competitor[0].athlete keys:", keys(c0?.athlete));
  console.log("competitor[0].athlete.headshot:", JSON.stringify(c0?.athlete?.headshot));

  // ---- SUMMARY (event detail) ----
  hr("B. SUMMARY endpoint — event detail (venue, course, field, tee times)");
  if (currentId) {
    const sum = await get(`${BASE}/pga/summary?event=${currentId}`);
    console.log(`summary?event=${currentId} → status=${sum.status} ${sum.bytes}b`);
    console.log("top-level keys:", keys(sum.json));
    console.log("header keys:", keys(sum.json?.header));
    console.log("gameInfo keys:", keys(sum.json?.gameInfo));
    console.log("gameInfo.venue:", JSON.stringify(sum.json?.gameInfo?.venue, null, 2)?.slice(0, 800));
    console.log("course(s):", JSON.stringify(sum.json?.course ?? sum.json?.courses ?? sum.json?.gameInfo?.course, null, 2)?.slice(0, 1200));
    console.log("leaderboard keys:", keys(sum.json?.leaderboard));
    console.log("pickcenter/news/standings present?:", {
      standings: !!sum.json?.standings,
      scoringSystem: !!sum.json?.scoringSystem,
      athletes: !!sum.json?.athletes,
    });
    // tee times often live under competitions[].competitors[].status or .teeTime
    const scomp = sum.json?.competitions?.[0] ?? sum.json?.header?.competitions?.[0];
    const sc0 = scomp?.competitors?.[0];
    console.log("summary competition keys:", keys(scomp));
    console.log("summary competitor[0]:", JSON.stringify(sc0, null, 2)?.slice(0, 1200));
  }

  // ---- STANDINGS (season scoreboard / FedExCup) ----
  hr("C. STANDINGS — season scoreboard candidates");
  const standingsCandidates = [
    `${BASE}/pga/standings`,
    `${BASE}/pga/standings?season=2026`,
    `${CORE}/pga/seasons/2026/types/2/standings`,
    `${CORE}/pga/seasons/2026/types/3/standings`,
  ];
  for (const url of standingsCandidates) {
    const r = await get(url);
    console.log(`\n${url}\n  status=${r.status} ${r.bytes}b ${r.err ?? ""}`);
    if (r.json) {
      console.log("  keys:", keys(r.json));
      const entries =
        r.json?.standings?.entries ??
        r.json?.children?.[0]?.standings?.entries ??
        r.json?.items ??
        [];
      console.log("  entries/items length:", Array.isArray(entries) ? entries.length : "n/a");
      if (Array.isArray(entries) && entries.length) {
        console.log("  sample entry:", JSON.stringify(entries[0], null, 2)?.slice(0, 900));
      }
    }
  }

  // ---- STATISTICS / LEADERS (scoring averages) ----
  hr("D. STATISTICS / LEADERS — scoring averages candidates");
  const statCandidates = [
    `${BASE}/pga/statistics`,
    `${BASE}/pga/leaders`,
    `${CORE}/pga/seasons/2026/types/2/leaders`,
    `${CORE}/pga/seasons/2026/athletes/statistics`,
  ];
  for (const url of statCandidates) {
    const r = await get(url);
    console.log(`\n${url}\n  status=${r.status} ${r.bytes}b ${r.err ?? ""}`);
    if (r.json) {
      console.log("  keys:", keys(r.json));
      const cats = r.json?.categories ?? r.json?.stats ?? r.json?.leaders?.categories ?? [];
      if (Array.isArray(cats) && cats.length) {
        console.log("  categories:", cats.map((c: any) => c?.name ?? c?.displayName).slice(0, 20).join(", "));
        console.log("  sample category[0]:", JSON.stringify(cats[0], null, 2)?.slice(0, 700));
      }
    }
  }

  // ---- most-recent completed leaderboard via dates ----
  hr("E. OFF-SEASON FALLBACK — most recent completed leaderboard");
  if (lastCompleted?.endDate) {
    const d = new Date(lastCompleted.endDate);
    const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    const r = await get(`${BASE}/pga/scoreboard?dates=${ymd}`);
    const e = r.json?.events?.[0];
    console.log(`scoreboard?dates=${ymd} → ${e?.name} state=${e?.status?.type?.state} competitors=${e?.competitions?.[0]?.competitors?.length}`);
    console.log("  → confirms we can render the last completed event's final board when nothing is live.");
  }

  hr("DONE");
}
main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
