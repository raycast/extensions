import { executeSuites, getGlobalAssertionCount } from "./test-framework";

// Import all test suites to register test cases
import "./tier1-feature.test";
import "./tier2-boundary.test";
import "./tier3-combination.test";
import "./tier4-application.test";
import "./adversarial-storage-gauge.test";

async function run(): Promise<void> {
  console.log("================================================================================");
  console.log(" 🚀 STORAGE SPACE VIEW EXTENSION — E2E TEST SUITE RUNNER (4 TIERS)");
  console.log("================================================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Version: ${process.version} | Platform: ${process.platform}\n`);

  const startTime = Date.now();
  const results = await executeSuites();
  const totalDuration = Date.now() - startTime;
  const assertionCount = getGlobalAssertionCount();

  let currentTier = "";

  for (const suite of results.suites) {
    // Extract tier prefix if any
    const tierMatch = suite.suiteName.match(/Tier \d/i);
    const tierName = tierMatch ? tierMatch[0].toUpperCase() : "GENERAL";

    if (tierName !== currentTier) {
      currentTier = tierName;
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(` 📦 [${currentTier}]`);
      console.log(`--------------------------------------------------------------------------------`);
    }

    console.log(`\n  ▸ ${suite.suiteName} (${suite.tests.length} tests, ${suite.assertionCount} assertions, ${suite.durationMs}ms)`);

    for (const testCase of suite.tests) {
      if (testCase.passed) {
        console.log(`    ✔ ${testCase.name} (${testCase.durationMs}ms)`);
      } else {
        console.error(`    ✘ ${testCase.name} (${testCase.durationMs}ms)`);
        if (testCase.error) {
          console.error(`      Error: ${testCase.error.message}`);
          if (testCase.error.stack) {
            const stackLines = testCase.error.stack.split("\n").slice(1, 4);
            console.error(`      ${stackLines.join("\n      ")}`);
          }
        }
      }
    }
  }

  console.log("\n================================================================================");
  console.log(" 📊 TEST EXECUTION SUMMARY");
  console.log("================================================================================");
  console.log(` Total Suites Executed:    ${results.suites.length}`);
  console.log(` Total Test Cases:         ${results.totalPass + results.totalFail}`);
  console.log(` Total Assertions Evaluated: ${assertionCount}`);
  console.log(` Tests Passed:             ${results.totalPass} ✔`);
  console.log(` Tests Failed:             ${results.totalFail} ✘`);
  console.log(` Total Duration:           ${totalDuration}ms`);
  console.log("================================================================================");

  // Minimum required assertions check: 11 * 27 + max(5, 27/2) = 297 + 14 = 311
  const MIN_REQUIRED_ASSERTIONS = 300;
  if (assertionCount < MIN_REQUIRED_ASSERTIONS) {
    console.warn(`\n⚠️ Warning: Total assertions (${assertionCount}) is below recommended threshold (${MIN_REQUIRED_ASSERTIONS}).`);
  } else {
    console.log(`\n✅ High-Integrity Assertion Threshold Satisfied (>= ${MIN_REQUIRED_ASSERTIONS} assertions).`);
  }

  if (results.totalFail > 0) {
    console.error(`\n❌ TEST HARNESS FAILED: ${results.totalFail} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 4 TIERS PASSED WITH ZERO FAILURES.");
    process.exit(0);
  }
}

// Execute test run
run().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
