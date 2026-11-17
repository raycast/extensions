import { performance } from "node:perf_hooks";
import { convert } from "../src/lib/convert.ts";
import { graphMarkdown } from "../src/lib/graph.ts";

const input = `linear(${Array.from({ length: 60 }, (_, i) => `${(i / 59 + Math.sin((i / 59) * Math.PI * 4) * 0.12).toFixed(6)} ${((i / 59) * 100).toFixed(6)}%`).join(", ")})`;
const cycle = () => {
  const result = convert(input);
  return { result, markdown: graphMarkdown(result.easing, "dark") };
};
for (let i = 0; i < 100; i++) cycle();
const times: number[] = [];
for (let i = 0; i < 2000; i++) {
  const start = performance.now();
  cycle();
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
const stats = {
  stages: "parse + all emitters + SVG + base64/Markdown (not native paint)",
  stops: 60,
  iterations: times.length,
  p50_ms: times[1000],
  p95_ms: times[1900],
  p99_ms: times[1980],
  max_ms: times.at(-1),
  input,
};
console.log(JSON.stringify(stats, null, 2));
