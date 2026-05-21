/**
 * Smoke test for {@link repairProcoreXer}. Run from repo root: `npm run test`.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  FIXED_XER_DIR_NAME,
  repairProcoreXer,
  guidForWbsPath,
  XerRepairValidationError,
} from "./xerRepair";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function run(): Promise<void> {
  const fixture = path.join(__dirname, "..", "..", "fixtures", "minimal.xer");
  assert(fs.existsSync(fixture), `Missing fixture: ${fixture}`);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "procore-xer-fixer-"));
  const input = path.join(dir, "minimal.xer");
  fs.copyFileSync(fixture, input);
  const outXer = path.join(dir, "out.xer");

  const result = await repairProcoreXer(input, {
    outputXerPath: outXer,
  });

  assert(result.counts.projwbsRowCount === 2, "Expected 2 PROJWBS rows");
  assert(result.counts.taskRowCount === 1, "Expected 1 TASK row");
  assert(
    result.counts.blankProjwbsGuidsBefore === 2,
    "Fixture should start with blank GUIDs",
  );
  assert(
    result.counts.blankProjwbsGuidsAfter === 0,
    "All PROJWBS.guid values should be filled",
  );
  assert(
    result.counts.duplicateProjwbsGuidsAfter === 0,
    "No duplicate GUIDs after repair",
  );
  assert(
    result.counts.blankTargetEndBefore === 1,
    "Fixture task should start with blank target_end_date",
  );
  assert(
    result.counts.blankTargetEndAfter === 0,
    "target_end_date should be backfilled",
  );
  assert(result.counts.unresolvedTasksAfterRepair === 0, "No unresolved tasks");

  const expectedW1 = guidForWbsPath("PRJ.W1");
  const body = fs.readFileSync(outXer, "utf8");
  assert(body.includes(expectedW1), `Output should contain GUID ${expectedW1}`);

  // UUIDv5(path) is deterministic: same path string => same GUID, always.
  assert(
    guidForWbsPath("PRJ.W1") === guidForWbsPath("PRJ.W1"),
    "guidForWbsPath must be stable for identical paths",
  );
  assert(
    guidForWbsPath("PRJ.W1") === "4a663b9f-91d8-5e19-b831-bbabc080dbc1",
    "Golden UUIDv5 for path PRJ.W1 (namespace prefix + uuid.URL)",
  );

  // Different numeric wbs_id values but identical segment path => same GUID in output.
  const altXer =
    "ERMHDR\t1\t2026-01-01\tP\t\tPC\tUSD\ten\n%T\tPROJWBS\n%F\twbs_id\tparent_wbs_id\twbs_short_name\twbs_name\tguid\n%R\t99\t\tPRJ\tRoot\t\n%R\t88\t99\tW1\tChild\t\n%T\tTASK\n%F\ttask_id\ttask_code\ttask_name\ttask_type\tstatus_code\ttarget_start_date\ttarget_end_date\tact_start_date\tact_end_date\tearly_start_date\tearly_end_date\tlate_start_date\tlate_end_date\n%R\t1\tT\tT\tTT_Task\tCS_NotStrt\t2025-01-01\t2025-01-02\t\t\t\t\t\t\t\n";
  const dirAlt = fs.mkdtempSync(path.join(os.tmpdir(), "procore-xer-altid-"));
  const altPath = path.join(dirAlt, "alt.xer");
  fs.writeFileSync(altPath, altXer, "utf8");
  const altOut = path.join(dirAlt, "out-alt.xer");
  await repairProcoreXer(altPath, { outputXerPath: altOut });
  const altBody = fs.readFileSync(altOut, "utf8");
  assert(
    altBody.includes(expectedW1),
    "Same WBS path PRJ.W1 must yield the same GUID when wbs_id values differ",
  );

  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "procore-xer-fixer2-"));
  const input2 = path.join(dir2, "sched.xer");
  fs.copyFileSync(fixture, input2);
  const r2 = await repairProcoreXer(input2);
  const fixedDir = path.join(dir2, FIXED_XER_DIR_NAME);
  assert(
    r2.outputDirectory === fixedDir,
    "Default output directory should be sibling fixed-xer",
  );
  assert(fs.existsSync(fixedDir), "fixed-xer directory should be created");
  assert(
    fs.existsSync(path.join(fixedDir, "sched_fixed.xer")),
    "Fixed XER should be written under fixed-xer",
  );

  console.log("All xerRepair self-tests passed.");
}

run().catch((e) => {
  if (e instanceof XerRepairValidationError) {
    console.error("Validation:", e.message);
  } else {
    console.error(e);
  }
  process.exit(1);
});
