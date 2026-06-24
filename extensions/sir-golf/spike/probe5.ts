/** Probe #5 — tournament logos (dig harder) + past-season schedule/results. */
const BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";
const CORE = "https://sports.core.api.espn.com/v2/sports/golf/leagues";
async function get(url: string) {
  const res = await fetch(url.replace(/^http:\/\//, "https://"));
  const t = await res.text();
  try {
    return { status: res.status, bytes: t.length, json: JSON.parse(t) };
  } catch {
    return { status: res.status, bytes: t.length, json: undefined };
  }
}
const k = (o: any) => (o && typeof o === "object" ? Object.keys(o).join(", ") : String(o));

async function main() {
  // Logos: check core event + tournament ref + scoreboard event for a major (The Open).
  console.log("=== LOGOS: core event fields for Travelers + The Open ===");
  for (const id of ["401811953" /*Travelers*/, "401703489" /*The Open '25? from calendar*/]) {
    const ev = (await get(`${CORE}/pga/events/${id}`)).json;
    console.log(`\nevent ${id} (${ev?.name}):`);
    console.log("  logos:", JSON.stringify(ev?.logos));
    console.log("  tournament.$ref:", ev?.tournament?.$ref);
    if (ev?.tournament?.$ref) {
      const t = (await get(ev.tournament.$ref)).json;
      console.log("  tournament keys:", k(t));
      console.log("  tournament.logos:", JSON.stringify(t?.logos));
      console.log("  tournament.logo:", JSON.stringify(t?.logo));
    }
  }

  // The current PGA calendar to grab real event ids + check scoreboard event for logos
  const sb = (await get(`${BASE}/pga/scoreboard`)).json;
  const ev0 = sb?.events?.[0];
  console.log("\n=== scoreboard event logo fields ===");
  console.log("  event keys:", k(ev0));
  console.log("  event.logo/logos:", JSON.stringify(ev0?.logo ?? ev0?.logos));
  // league logo as a fallback brand image
  console.log("  league.logos:", JSON.stringify(sb?.leagues?.[0]?.logos)?.slice(0, 300));

  // Past-season schedule + results: scoreboard?dates=YYYY gives all events w/ winners.
  console.log("\n=== PAST SEASON (2024) schedule + results ===");
  const past = (await get(`${BASE}/pga/scoreboard?dates=2024`)).json;
  const cal = past?.leagues?.[0]?.calendar ?? [];
  const events = past?.events ?? [];
  console.log("  calendar length:", cal.length, "| events length:", events.length);
  // winner of a completed past event
  const done = events.find((e: any) => e?.status?.type?.state === "post");
  if (done) {
    const winner = done?.competitions?.[0]?.competitors?.find((c: any) => c.order === 1 || c.winner);
    console.log(`  sample past event: ${done.name} → winner: ${winner?.athlete?.displayName} (${winner?.score})`);
  }
  console.log("  → can list any past season's events + winners from one scoreboard?dates=YEAR call");

  // available seasons list?
  const seasons = (await get(`${CORE}/pga/seasons?limit=50`)).json;
  console.log("\n=== available seasons (core) ===");
  console.log("  count:", seasons?.count, "items sample:", JSON.stringify((seasons?.items ?? []).slice(0, 3)?.map((i: any) => i.$ref))?.slice(0, 300));
}
main().catch((e) => console.error("FATAL", e));
