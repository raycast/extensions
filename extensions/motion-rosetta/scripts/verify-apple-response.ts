import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fromDuration, springValue } from "../src/lib/model.ts";

// Independent oracle: execute Apple's SDK, not the parser or an emitted formula.
const directory = mkdtempSync(join(tmpdir(), "rosetta-apple-response-"));
const source = join(directory, "Oracle.swift");
const binary = join(directory, "oracle");
writeFileSync(
  source,
  `import SwiftUI
import Foundation
let bounces: [Double] = [-0.9, -0.5, -0.333, 0, 0.3, 0.6, 1]
var records: [[String: Any]] = []
for bounce in bounces {
  let spring = Spring(duration: 0.5, bounce: bounce)
  let values = (0...100).map { spring.value(target: 1.0, time: Double($0) / 100) }
  records.append(["bounce": bounce, "zeta": spring.dampingRatio, "values": values])
}
let physical = [20.0, 21.0, 60.0, 100.0].map { damping in
  let spring = Spring(mass: 1, stiffness: 100, damping: damping)
  return ["damping": damping, "zeta": spring.dampingRatio]
}
let data = try JSONSerialization.data(withJSONObject: ["records": records, "physical": physical])
print(String(data: data, encoding: .utf8)!)
`,
);
const compiled = spawnSync(
  "xcrun",
  [
    "swiftc",
    "-module-cache-path",
    join(directory, "cache"),
    source,
    "-o",
    binary,
  ],
  { encoding: "utf8" },
);
if (compiled.status !== 0) throw new Error(compiled.stderr);
const executed = spawnSync(binary, [], { encoding: "utf8" });
if (executed.status !== 0) throw new Error(executed.stderr);
const oracle = JSON.parse(executed.stdout) as {
  records: { bounce: number; zeta: number; values: number[] }[];
  physical: { damping: number; zeta: number }[];
};
for (const row of oracle.records) {
  const spring = fromDuration(0.5, row.bounce);
  const error = Math.max(
    ...row.values.map((value, i) =>
      Math.abs(value - springValue(spring, i / 100)),
    ),
  );
  if (
    !Number.isFinite(error) ||
    error > 1e-8 ||
    Math.abs(spring.zeta - row.zeta) > 1e-10
  )
    throw new Error(
      `Apple response mismatch: bounce ${row.bounce}, error ${error}`,
    );
  console.log(
    `Apple runtime response passed: bounce ${row.bounce}; max error ${error}`,
  );
}
console.log(
  "Apple Spring physical initializer (not Animation.interpolatingSpring):",
  oracle.physical,
);
