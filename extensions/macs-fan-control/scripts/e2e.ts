// End-to-end check against a real Macs Fan Control install.
// Mutates presets, then restores the original state. Run: npm run e2e
import {
  getCustomPresets, getActivePreset, findPresetByName, applyPreset,
  upsertPreset, deletePreset, renamePreset, encodePreset, decodePreset, describePreset,
} from "../src/lib/mfc";
import { execFile } from "child_process";
import { promisify } from "util";
const exec = promisify(execFile);

import { join } from "path";
const SMC = join(process.cwd(), "assets", "smc-reader");
async function fans() {
  const { stdout } = await exec(SMC);
  return JSON.parse(stdout).fans.map((f: any) => `f${f.index}=${f.actual}rpm/mode${f.mode}`).join(" ");
}
const log = (...a: any[]) => console.log(...a);
let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  log(`${cond ? "  PASS" : "  FAIL"}  ${label} ${extra}`);
  if (!cond) failures++;
}

(async () => {
  log("=== 1. round-trip encoding (incl. sensor-based passthrough) ===");
  const weird = "Sensor Test|0|2,TC0P,45,85";
  const rt = decodePreset(Buffer.from(weird).toString("base64"), 0)!;
  check("name parsed", rt.name === "Sensor Test", rt.name);
  check("auto fan parsed", rt.fans[0].kind === "auto");
  check("sensor fan kept raw", rt.fans[1].kind === "raw" && (rt.fans[1] as any).raw === "2,TC0P,45,85");
  check("re-encodes byte-identical", Buffer.from(encodePreset(rt), "base64").toString() === weird);
  log("  describe:", describePreset(rt));

  log("\n=== 2. read live config ===");
  const before = await getCustomPresets();
  const activeBefore = await getActivePreset();
  log("  presets:", JSON.stringify(before.map(p => p.name)), "active:", JSON.stringify(activeBefore));
  check("found user's real presets", before.length > 0);

  log("\n=== 3. name lookup ===");
  check("exact 'Half'", findPresetByName("Half", before)?.label === "Half");
  check("lowercase 'half'", findPresetByName("half", before)?.label === "Half");
  check("prefix 'hal'", findPresetByName("hal", before)?.label === "Half");
  check("alias 'auto'", findPresetByName("auto", before)?.ref.type === "predefined");
  check("alias 'max' -> full", findPresetByName("max", before)?.ref.index === 1);
  check("unknown returns null", findPresetByName("zzzz", before) === null);

  log("\n=== 4. apply user's real preset ===");
  const half = findPresetByName("half", before)!;
  await applyPreset(half.ref);
  log("  " + await fans());
  check("Half applied (~4500)", (await exec(SMC)).stdout.includes("4500"));

  log("\n=== 5. upsert + activate a new preset ===");
  const created = await upsertPreset("ZZ E2E Test", [{ kind: "constant", rpm: 3200 }, { kind: "constant", rpm: 3200 }], { activate: true });
  log("  created at index", created.index, "|", await fans());
  const afterCreate = await getCustomPresets();
  check("preset added", afterCreate.some(p => p.name === "ZZ E2E Test"));
  check("user's Half survived", afterCreate.some(p => p.name === "Half"));
  check("fans at 3200", (await exec(SMC)).stdout.includes("3200"));

  log("\n=== 6. rename ===");
  await renamePreset(created, "ZZ Renamed");
  const afterRename = await getCustomPresets();
  check("renamed", afterRename.some(p => p.name === "ZZ Renamed"));
  check("still active + 3200", (await exec(SMC)).stdout.includes("3200"));

  log("\n=== 7. delete active preset re-points ActivePreset ===");
  const target = (await getCustomPresets()).find(p => p.name === "ZZ Renamed")!;
  await deletePreset(target);
  const afterDelete = await getCustomPresets();
  const activeAfter = await getActivePreset();
  check("preset gone", !afterDelete.some(p => p.name.startsWith("ZZ")));
  check("Half still there", afterDelete.some(p => p.name === "Half"));
  check("active fell back to Automatic", activeAfter?.type === "predefined" && activeAfter.index === 0, JSON.stringify(activeAfter));
  log("  " + await fans());

  log("\n=== 8. restore original state ===");
  if (activeBefore) await applyPreset(activeBefore);
  const finalPresets = await getCustomPresets();
  const finalActive = await getActivePreset();
  check("presets identical to start", JSON.stringify(finalPresets.map(p=>p.name)) === JSON.stringify(before.map(p=>p.name)), JSON.stringify(finalPresets.map(p=>p.name)));
  check("active identical to start", JSON.stringify(finalActive) === JSON.stringify(activeBefore), JSON.stringify(finalActive));
  log("  " + await fans());

  log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
  process.exit(failures === 0 ? 0 : 1);
})();
