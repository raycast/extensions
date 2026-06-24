/** Probe #4 — athlete detail + per-player season statistics for the detail pane. */
const CORE = "https://sports.core.api.espn.com/v2/sports/golf/leagues";
async function get(url: string) {
  const res = await fetch(url.replace(/^http:\/\//, "https://"));
  const t = await res.text();
  try {
    return { status: res.status, json: JSON.parse(t) };
  } catch {
    return { status: res.status, json: undefined };
  }
}
const k = (o: any) => (o && typeof o === "object" ? Object.keys(o).join(", ") : String(o));

async function main() {
  const ID = "9478"; // Scottie Scheffler
  console.log("=== athlete detail ===");
  const a = (await get(`${CORE}/pga/athletes/${ID}`)).json;
  console.log("keys:", k(a));
  console.log(
    JSON.stringify(
      {
        displayName: a?.displayName,
        flag: a?.flag?.href,
        headshot: a?.headshot?.href,
        age: a?.age,
        dob: a?.dateOfBirth,
        birthPlace: a?.birthPlace,
        citizenship: a?.citizenship,
        weight: a?.displayWeight,
        height: a?.displayHeight,
        hand: a?.hand?.displayValue ?? a?.hand,
        turnedPro: a?.turnedPro ?? a?.debutYear,
      },
      null,
      2,
    ),
  );

  console.log("\n=== per-player season statistics (one call) ===");
  const s = (await get(`${CORE}/pga/seasons/2026/types/2/athletes/${ID}/statistics/0`)).json;
  console.log("top keys:", k(s));
  const cats = s?.splits?.categories ?? s?.categories ?? [];
  for (const c of cats.slice(0, 4)) {
    console.log(`\ncategory: ${c?.name ?? c?.displayName}`);
    for (const st of (c?.stats ?? []).slice(0, 8)) {
      console.log(`  ${st?.displayName ?? st?.name}: ${st?.displayValue}`);
    }
  }

  console.log("\n=== world ranking? (search core for rankings) ===");
  const wr = (await get(`${CORE}/pga/seasons/2026/types/2/athletes/${ID}`)).json;
  console.log("athlete-in-season keys:", k(wr));
  console.log("rank:", JSON.stringify(wr?.rank ?? wr?.statistics?.rank));
}
main().catch((e) => console.error("FATAL", e));
