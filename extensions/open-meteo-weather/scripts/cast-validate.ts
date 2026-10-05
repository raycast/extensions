// Dev-only: structural validation of the generated SVGs' SMIL animations.
// Renderers silently drop animations with mismatched keyTimes/keySplines,
// so catch that here. Run with `npx tsx scripts/cast-validate.ts`.
import { readdirSync, readFileSync } from "node:fs";

const dir = "/tmp/cast-previews";
let problems = 0;

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1];
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
  const svg = readFileSync(`${dir}/${file}`, "utf8");
  const tags = svg.match(/<animate(?:Transform|Motion)?\b[^>]*>/g) ?? [];
  tags.forEach((tag, i) => {
    const complain = (msg: string) => {
      problems++;
      console.log(`${file} [anim ${i}]: ${msg}\n  ${tag.slice(0, 160)}`);
    };
    const values = attr(tag, "values")?.split(";").length;
    const keyTimes = attr(tag, "keyTimes")?.split(";");
    const keySplines = attr(tag, "keySplines")?.split(";").length;
    const keyPoints = attr(tag, "keyPoints")?.split(";").length;
    const isMotion = tag.startsWith("<animateMotion");
    if (!attr(tag, "dur")) complain("missing dur");
    if (values !== undefined && values < 2) complain("fewer than 2 values");
    if (keyTimes) {
      const n = isMotion ? (keyPoints ?? 2) : values;
      if (n !== undefined && keyTimes.length !== n) complain(`keyTimes count ${keyTimes.length} != ${n}`);
      if (Number(keyTimes[0]) !== 0) complain("keyTimes must start at 0");
      if (Number(keyTimes[keyTimes.length - 1]) !== 1) complain("keyTimes must end at 1");
      for (let k = 1; k < keyTimes.length; k++)
        if (Number(keyTimes[k]) < Number(keyTimes[k - 1])) complain("keyTimes not monotonic");
    }
    if (attr(tag, "calcMode") === "spline") {
      if (!keyTimes) complain("spline mode requires keyTimes");
      const segs = (isMotion ? (keyPoints ?? values ?? 2) : (values ?? 2)) - 1;
      if (keySplines !== undefined && keySplines !== segs) complain(`keySplines count ${keySplines} != ${segs}`);
      if (keySplines === undefined) complain("spline mode requires keySplines");
    }
  });
  // Unique-id sanity: duplicated defs ids break gradients/clips when several
  // scenes end up in the same document.
  const ids = svg.match(/\bid="([^"]+)"/g) ?? [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      problems++;
      console.log(`${file}: duplicate ${id}`);
    }
    seen.add(id);
  }
}
console.log(problems === 0 ? "All animations structurally valid." : `${problems} problem(s) found.`);
process.exit(problems === 0 ? 0 : 1);
