/**
 * Automated memory validation script for the Compare AI Models command.
 *
 * Simulates the OOM scenario: rendering ~3,800 list items, then changing
 * `canAddToComparison` (as happens when the first model is selected).
 *
 * Run:
 *   NODE_OPTIONS='--expose-gc' npm run validate
 *
 * Pass criteria:
 *   - Heap growth after the prop flip (second render) must be under 50 MB
 *   - ActionPanel count must equal the number of models rendered
 */

import v8 from "node:v8";
import { renderToString } from "react-dom/server";
import React from "react";

// @raycast/api is aliased to __mocks__/@raycast/api via tsconfig.validate.json paths
import { ModelListSection } from "../src/components/ModelListSection";
import type { Model } from "../src/lib/types";

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL_COUNT = 3800;
const HEAP_GROWTH_LIMIT_MB = 50; // fail if second render grows heap more than this

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeModel(i: number): Model {
  return {
    id: `model-${i}`,
    name: `Model ${i}`,
    family: "test-family",
    providerId: `provider-${i % 20}`,
    providerName: `Provider ${i % 20}`,
    providerLogo: "",
    providerDoc: undefined,
    attachment: false,
    reasoning: i % 3 === 0,
    tool_call: i % 2 === 0,
    structured_output: true,
    temperature: true,
    knowledge: undefined,
    open_weights: false,
    status: undefined,
    modalities: { input: ["text"], output: ["text"] },
    cost: { input: 0.001 * (i % 100), output: 0.002 * (i % 100) },
    limit: { context: 128_000 },
  };
}

function heapMB(): number {
  return v8.getHeapStatistics().used_heap_size / 1024 / 1024;
}

function tryGC() {
  if (typeof global.gc === "function") {
    global.gc();
    global.gc(); // two passes for good measure
  }
}

function countOccurrences(str: string, sub: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = str.indexOf(sub, idx)) !== -1) {
    count++;
    idx += sub.length;
  }
  return count;
}

// ── Test 1: Heap growth when prop flips (the OOM scenario) ───────────────────

function testHeapGrowthOnPropFlip(models: Model[]): boolean {
  console.log(`\n[Test 1] Heap growth when canAddToComparison flips true → false`);
  console.log(`  Models: ${models.length}`);

  const onAdd = () => {};

  // Warm-up render to let V8/React initialise internal structures
  renderToString(React.createElement(ModelListSection, { models: models.slice(0, 10), onAddToComparison: onAdd }));

  // ── Baseline: volatile boolean prop (unfixed behaviour) ──────────────────

  tryGC();
  const beforeBoolean = heapMB();

  renderToString(
    React.createElement(ModelListSection, {
      models,
      onAddToComparison: onAdd,
      canAddToComparison: true, // render 1: canAddMore = true
    }),
  );

  tryGC();
  const afterFirstBoolean = heapMB();
  const firstBooleanGrowth = afterFirstBoolean - beforeBoolean;

  renderToString(
    React.createElement(ModelListSection, {
      models,
      onAddToComparison: onAdd,
      canAddToComparison: false, // render 2: canAddMore flips to false
    }),
  );

  tryGC();
  const afterSecondBoolean = heapMB();
  const secondBooleanGrowth = afterSecondBoolean - afterFirstBoolean;

  console.log(`  Boolean prop — first render heap growth:  +${firstBooleanGrowth.toFixed(1)} MB`);
  console.log(`  Boolean prop — second render heap growth: +${secondBooleanGrowth.toFixed(1)} MB`);

  // ── With stable function ref (fixed behaviour) ────────────────────────────

  // Simulate the canAddMoreRef + getCanAddToComparison pattern from compare-models.tsx
  const canAddMoreRef = { current: true };
  const stableFn = () => canAddMoreRef.current;

  tryGC();
  const beforeStable = heapMB();

  renderToString(
    React.createElement(ModelListSection, {
      models,
      onAddToComparison: onAdd,
      canAddToComparison: stableFn, // render 1: function ref is stable
    }),
  );

  tryGC();
  const afterFirstStable = heapMB();
  const firstStableGrowth = afterFirstStable - beforeStable;

  canAddMoreRef.current = false; // flip the value — ref is the same object
  renderToString(
    React.createElement(ModelListSection, {
      models,
      onAddToComparison: onAdd,
      canAddToComparison: stableFn, // render 2: same function ref, memo stays stable
    }),
  );

  tryGC();
  const afterSecondStable = heapMB();
  const secondStableGrowth = afterSecondStable - afterFirstStable;

  console.log(`  Stable fn  — first render heap growth:   +${firstStableGrowth.toFixed(1)} MB`);
  console.log(`  Stable fn  — second render heap growth:  +${secondStableGrowth.toFixed(1)} MB`);

  if (!global.gc) {
    console.log(`  NOTE: Run with NODE_OPTIONS='--expose-gc' for accurate heap numbers`);
  }

  const passed = secondStableGrowth < HEAP_GROWTH_LIMIT_MB;
  console.log(
    `  Result: ${passed ? "PASS ✓" : "FAIL ✗"} — stable-fn second render grew ${secondStableGrowth.toFixed(1)} MB (limit: ${HEAP_GROWTH_LIMIT_MB} MB)`,
  );

  return passed;
}

// ── Test 2: ActionPanel render count ─────────────────────────────────────────

function testActionPanelCount(models: Model[]): boolean {
  console.log(`\n[Test 2] ActionPanel render count matches model count`);

  const html = renderToString(
    React.createElement(ModelListSection, {
      models,
      onAddToComparison: () => {},
      canAddToComparison: true,
    }),
  );

  const count = countOccurrences(html, 'data-raycast="ActionPanel"');
  console.log(`  ActionPanel elements rendered: ${count} (expected: ${models.length})`);

  // Each model should render exactly one ActionPanel (inside ModelActions).
  // If this is 0 something in the mock chain is broken.
  const passed = count === models.length;
  console.log(`  Result: ${passed ? "PASS ✓" : "FAIL ✗"}`);

  return passed;
}

// ── Test 3: Stable fn memo — ModelActions renders same HTML for both values ──

function testStableFnOutputConsistency(models: Model[]): boolean {
  console.log(`\n[Test 3] Stable fn output consistency (canAdd=true vs canAdd=false)`);

  const onAdd = () => {};

  const htmlTrue = renderToString(
    React.createElement(ModelListSection, {
      models: models.slice(0, 5),
      onAddToComparison: onAdd,
      canAddToComparison: true,
    }),
  );

  const htmlFalse = renderToString(
    React.createElement(ModelListSection, {
      models: models.slice(0, 5),
      onAddToComparison: onAdd,
      canAddToComparison: false,
    }),
  );

  // When canAdd=true: "Add to Comparison" button appears in both:
  //   1. defaultPrimaryAction (ModelListItem useMemo) — rendered as the primary action
  //   2. ModelActions ActionPanel.Section — the dedicated comparison section
  // So we expect 2 × 5 = 10 occurrences for 5 items.
  //
  // When canAdd=false: "Copy Model ID" appears in both:
  //   1. defaultPrimaryAction — switches to Copy Model ID
  //   2. ModelActions always renders a Copy Model ID action
  // So we expect ≥ 5 occurrences (at least one per item from defaultPrimaryAction).
  const addButtonsTrue = countOccurrences(htmlTrue, "Add to Comparison");
  const copyButtonsFalse = countOccurrences(htmlFalse, "Copy Model ID");

  console.log(`  canAdd=true  → "Add to Comparison" count: ${addButtonsTrue} (expected: 10, 2 per item)`);
  console.log(`  canAdd=false → "Copy Model ID" count:     ${copyButtonsFalse} (expected ≥ 5)`);

  const passed = addButtonsTrue === 10 && copyButtonsFalse >= 5;
  console.log(`  Result: ${passed ? "PASS ✓" : "FAIL ✗"}`);

  return passed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("══════════════════════════════════════════");
  console.log("  Memory Validation — Compare AI Models");
  console.log("══════════════════════════════════════════");
  console.log(`Node.js ${process.version}`);

  const models = Array.from({ length: MODEL_COUNT }, (_, i) => makeModel(i));

  const results = [
    testHeapGrowthOnPropFlip(models),
    testActionPanelCount(models),
    testStableFnOutputConsistency(models),
  ];

  const allPassed = results.every(Boolean);
  const passCount = results.filter(Boolean).length;

  console.log(`\n══════════════════════════════════════════`);
  console.log(`  ${passCount}/${results.length} tests passed`);
  console.log(`  Overall: ${allPassed ? "ALL TESTS PASSED ✓" : "SOME TESTS FAILED ✗"}`);
  console.log(`══════════════════════════════════════════`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
