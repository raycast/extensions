/** Probe #3c — final field check for the This Week detail view. */
const CORE = "http://sports.core.api.espn.com/v2/sports/golf/leagues";
const BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";
async function get(url: string) {
  const res = await fetch(url.replace("http://", "https://"));
  const t = await res.text();
  try {
    return { status: res.status, json: JSON.parse(t) };
  } catch {
    return { status: res.status, json: undefined };
  }
}
const k = (o: any) => (o && typeof o === "object" ? Object.keys(o).join(", ") : String(o));

async function main() {
  const ID = "401811953"; // Travelers
  const ev = (await get(`${CORE}/pga/events/${ID}`)).json;
  console.log("purse:", ev?.purse, "| displayPurse:", ev?.displayPurse, "| isSignature:", ev?.isSignature);
  console.log("tournament:", JSON.stringify(ev?.tournament)?.slice(0, 200));
  console.log("event.logos:", JSON.stringify(ev?.logos));
  console.log("links:", JSON.stringify((ev?.links ?? []).map((l: any) => ({ text: l.text, href: l.href })))?.slice(0, 500));

  // venue
  const vref = ev?.venues?.[0]?.$ref;
  if (vref) {
    const v = (await get(vref)).json;
    console.log("\nVENUE keys:", k(v));
    console.log("venue:", JSON.stringify({ name: v?.fullName ?? v?.name, city: v?.address?.city, state: v?.address?.state, country: v?.address?.country }));
  }
  // courses (key present on event)
  console.log("\nevent.courses:", JSON.stringify(ev?.courses)?.slice(0, 400));
  const cref = ev?.courses?.[0]?.$ref ?? ev?.courses?.$ref;
  if (cref) {
    const c = (await get(cref)).json;
    console.log("COURSE keys:", k(c));
    console.log("course:", JSON.stringify({ name: c?.name, par: c?.shotsToPar ?? c?.totalPar, yards: c?.totalYards, address: c?.address }, null, 2)?.slice(0, 500));
  }
  // defending champion
  const dref = ev?.defendingChampion?.$ref ?? ev?.defendingChampion?.athlete?.$ref;
  console.log("\ndefendingChampion raw:", JSON.stringify(ev?.defendingChampion)?.slice(0, 300));
  if (dref) {
    const d = (await get(dref)).json;
    console.log("defending champ:", d?.displayName ?? d?.fullName);
  }

  // field + broadcasts from the cheap scoreboard
  const sb = (await get(`${BASE}/pga/scoreboard`)).json;
  const comp = sb?.events?.[0]?.competitions?.[0];
  console.log("\nfield size (competitors):", comp?.competitors?.length);
  console.log("broadcasts:", JSON.stringify(comp?.broadcasts ?? comp?.geoBroadcasts)?.slice(0, 400));
  console.log("event.links (scoreboard):", JSON.stringify((sb?.events?.[0]?.links ?? []).map((l: any) => ({ text: l.text, href: l.href })))?.slice(0, 400));

  // all leader categories (for the stats command dropdown)
  const lead = (await get(`${CORE}/pga/seasons/2026/types/2/leaders`)).json;
  console.log("\nALL leader categories:");
  for (const c of lead?.categories ?? []) console.log(`  ${c.name}\t${c.displayName}\t(${(c.leaders ?? []).length} players)`);
}
main().catch((e) => console.error("FATAL", e));
