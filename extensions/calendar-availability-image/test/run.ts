import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseBusyEvents } from "../src/lib/ics";
import { toOptions } from "../src/lib/options";
import { buildPlan, rangeFor } from "../src/lib/plan";
import { svgToPng } from "../src/lib/png";
import { renderSvg } from "../src/lib/render";

async function main() {
  const [icsPath, outPath, nowIso, lang] = process.argv.slice(2);
  const opts = toOptions({ icsUrl: "", language: lang });
  const now = new Date(nowIso);
  const { start, end } = rangeFor(now, opts);
  const events = parseBusyEvents(readFileSync(icsPath, "utf8"), start, end);
  const weeks = buildPlan(events, now, opts);
  const f = (ms: number) => new Date(ms).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  for (const e of events) console.log(e.tentative ? "T" : "B", e.allDay ? "allday" : "", f(e.start), "->", f(e.end));
  for (const d of weeks.flat())
    console.log(
      d.date.toDateString(),
      "free:",
      d.free.map((i) => f(i.start).slice(-8, -3) + "-" + f(i.end).slice(-8, -3)).join(" "),
    );

  const { svg } = renderSvg(weeks, now, opts);

  writeFileSync(outPath, await svgToPng(svg, join(__dirname, "..", "assets")));
}
main();
