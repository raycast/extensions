import { getSeason, buildEventIcs } from "../src/espn";
(async () => {
  for (const t of ["pga","lpga","eur"] as const) {
    const s = await getSeason(t, 2026);
    const majors = s.entries.filter(e => e.isMajor);
    console.log(`\n${t.toUpperCase()} majors (${majors.length}):`);
    majors.forEach(m => console.log(`  ${m.startDate?.slice(0,10)}  ${m.name}  ->  ${m.majorLabel}`));
  }
  // ICS sanity
  const s = await getSeason("pga", 2026);
  const open = s.entries.find(e => e.majorLabel === "The Open");
  if (open) {
    console.log("\n--- sample ICS (The Open) ---");
    console.log(buildEventIcs({ uid: open.id ?? "x", name: `${open.name} (PGA Tour)`, startDate: open.startDate, endDate: open.endDate, url: "https://espn.com" }));
  }
})();
