/**
 * Probe #3b — close the remaining unknowns for the richer build:
 *   1. SUMMARY (retry; transient 502 before) for a COMPLETED event — richest
 *      single call: venue, course, field, tee times, leaderboard.
 *   2. CORE event endpoint for venue/course when summary is unavailable.
 *   3. Confirm leader athlete $ref resolution (names) for cupPoints + scoringAverage.
 *   4. Cost of resolving N athlete refs in parallel (rate-limit sanity).
 *
 * Run: npx tsx spike/probe3b.ts
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
const hr = (s: string) => console.log("\n" + "=".repeat(72) + "\n" + s + "\n" + "=".repeat(72));
const keys = (o: any) => (o && typeof o === "object" ? Object.keys(o).join(", ") : String(o));

async function main() {
  const CURRENT = "401811953"; // Travelers (pre)
  const DONE = "401811952"; // U.S. Open (post)

  // 1. SUMMARY with retries, for both current and completed.
  hr("1. SUMMARY — retry x3, current + completed");
  for (const id of [DONE, CURRENT]) {
    let r;
    for (let i = 0; i < 3; i++) {
      r = await get(`${BASE}/pga/summary?event=${id}`);
      if (r.status === 200) break;
    }
    console.log(`\nevent ${id}: status=${r!.status} ${r!.bytes}b`);
    if (r!.status === 200 && r!.json) {
      const j = r!.json;
      console.log("  top keys:", keys(j));
      const hdrComp = j?.header?.competitions?.[0];
      console.log("  header.competitions[0] keys:", keys(hdrComp));
      console.log("  gameInfo keys:", keys(j?.gameInfo));
      console.log("  gameInfo.venue:", JSON.stringify(j?.gameInfo?.venue, null, 2)?.slice(0, 600));
      console.log("  course/courses:", JSON.stringify(j?.course ?? j?.courses, null, 2)?.slice(0, 900));
      console.log("  leaderboard? :", !!j?.leaderboard, "competitions?", !!j?.competitions);
      const cmp = j?.competitions?.[0];
      const cc0 = cmp?.competitors?.[0];
      console.log("  competitions[0] keys:", keys(cmp));
      console.log("  competitor[0] (tee time/status):", JSON.stringify({ teeTime: cc0?.teeTime, status: cc0?.status, order: cc0?.order, name: cc0?.athlete?.displayName }, null, 2)?.slice(0, 600));
      // links to course / event site
      console.log("  links sample:", JSON.stringify((j?.header?.links ?? j?.links)?.slice?.(0, 3), null, 2)?.slice(0, 600));
    }
  }

  // 2. CORE event endpoint — venue/course refs.
  hr("2. CORE event endpoint — venue/course");
  const cev = await get(`${CORE}/pga/events/${CURRENT}`);
  console.log(`core event ${CURRENT}: status=${cev.status} ${cev.bytes}b`);
  console.log("  keys:", keys(cev.json));
  console.log("  name:", cev.json?.name, "| venues:", JSON.stringify(cev.json?.venues)?.slice(0, 300));
  const compRef = cev.json?.competitions?.[0]?.$ref;
  console.log("  competition $ref:", compRef);
  if (compRef) {
    const cc = await get(compRef.replace("http://", "https://"));
    console.log("  competition keys:", keys(cc.json));
    console.log("  competition.venue:", JSON.stringify(cc.json?.venue, null, 2)?.slice(0, 500));
    const courseRef = cc.json?.course?.$ref ?? cc.json?.courses?.[0]?.$ref;
    console.log("  course $ref:", courseRef);
    if (courseRef) {
      const course = await get(courseRef.replace("http://", "https://"));
      console.log("  COURSE:", JSON.stringify({ name: course.json?.name, address: course.json?.address, par: course.json?.totalPar ?? course.json?.shotsToPar, yardage: course.json?.totalYards }, null, 2));
    }
  }

  // 3 + 4. Leaders → resolve athlete refs (names) for cupPoints + scoringAverage.
  hr("3. LEADERS resolve — cupPoints (season) + scoringAverage");
  const leaders = await get(`${CORE}/pga/seasons/2026/types/2/leaders`);
  const cats: any[] = leaders.json?.categories ?? [];
  for (const wanted of ["cupPoints", "scoringAverage"]) {
    const cat = cats.find((c) => c.name === wanted);
    if (!cat) {
      console.log(`\n[${wanted}] NOT FOUND`);
      continue;
    }
    const top = (cat.leaders ?? []).slice(0, 5);
    console.log(`\n[${wanted}] "${cat.displayName}" — top ${top.length}, resolving names in parallel…`);
    const t0 = Date.now();
    const resolved = await Promise.all(
      top.map(async (l: any) => {
        const a = await get(String(l.athlete?.$ref).replace("http://", "https://"));
        return { value: l.displayValue, name: a.json?.displayName ?? a.json?.fullName };
      })
    );
    console.log(`  resolved ${resolved.length} in ${Date.now() - t0}ms (parallel):`);
    for (const r of resolved) console.log(`   ${r.value}\t${r.name}`);
  }

  hr("DONE");
}
main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
