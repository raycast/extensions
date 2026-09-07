// Regression test: an upsert must never lose an existing preset.
import { getCustomPresets, upsertPreset, deletePreset } from "../src/lib/mfc";

(async () => {
  let bad = 0;
  const check = (l: string, c: boolean, x = "") => { console.log(`${c ? "  PASS" : "  FAIL"}  ${l} ${x}`); if (!c) bad++; };

  const before = await getCustomPresets();
  console.log("before:", JSON.stringify(before.map(p => p.name)));
  check("user's presets are readable", before.length > 0);

  console.log("upserting 'ZZ Guard' — every existing preset must survive");
  await upsertPreset("ZZ Guard", [{ kind: "constant", rpm: 3000 }, { kind: "constant", rpm: 3000 }]);
  const mid = await getCustomPresets();
  console.log("after upsert:", JSON.stringify(mid.map(p => p.name)));
  for (const p of before) check(`'${p.name}' survived the upsert`, mid.some(q => q.name === p.name));
  check("new preset added", mid.some(p => p.name === "ZZ Guard"));

  const target = mid.find(p => p.name === "ZZ Guard")!;
  await deletePreset(target.index);
  const after = await getCustomPresets();
  console.log("after delete:", JSON.stringify(after.map(p => p.name)));
  check("only the target was removed",
    JSON.stringify(after.map(p => p.name)) === JSON.stringify(before.map(p => p.name)),
    JSON.stringify(after.map(p => p.name)));

  console.log(bad === 0 ? "\nGUARD TESTS PASSED" : `\n${bad} FAILED`);
  process.exit(bad === 0 ? 0 : 1);
})();
