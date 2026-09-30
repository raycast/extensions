// Prints each Compose format for a sample input: handy for checking alignment in a terminal.
import { FORMATS } from "../src/lib/formats";
import { SAMPLES } from "./samples";

const only = process.argv[2];
for (const f of FORMATS) {
  if (only && f.kind !== only && f.id !== only) continue;
  console.log(`── ${f.title} ${"─".repeat(Math.max(0, 40 - f.title.length))}`);
  console.log(f.render(SAMPLES[f.kind]) + "\n");
}
