import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { convert } from "../src/lib/convert.ts";

const directory = mkdtempSync(join(tmpdir(), "motion-rosetta-swift-"));
const cases = [
  "0.42, 0, 0.58, 1",
  ".spring(duration:0.5,bounce:0.6)",
  "{mass:2,stiffness:200,damping:20,velocity:3}",
  "linear(0, 0.5 30%, 1)",
  "steps(4,jump-end)",
  "steps(4,jump-start)",
  "steps(4,jump-none)",
  "steps(4,jump-both)",
  "linear(0, 0.2 40%, 0.8 40%, 1)",
  ".timingCurve(0.42,0,0.58,1,duration:0)",
  ".spring(duration:0.001,bounce:0.6)",
  ".spring(duration:0.5,bounce:1)",
  ".spring(duration:0.5,bounce:-0.5)",
  "{mass:1000000,stiffness:0.001,damping:0}",
];
for (let i = 0; i < cases.length; i++) {
  const code = convert(cases[i]).outputs.find((o) => o.id === "swiftui")!.code!;
  const path = join(directory, `Case${i}.swift`);
  writeFileSync(
    path,
    code.startsWith("import")
      ? code
      : `import SwiftUI\nlet example: Animation = ${code}\n`,
  );
  const result = spawnSync(
    "xcrun",
    [
      "swiftc",
      "-typecheck",
      "-module-cache-path",
      join(directory, "cache"),
      path,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(1);
  }
  console.log(`Swift typecheck passed: ${cases[i]}`);
}
console.log(`Generated verification fixtures: ${directory}`);
