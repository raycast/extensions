#!/usr/bin/env node

/**
 * Test script for Kitty API integration
 * Run with: node test-kitty.js
 */

const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

async function testKittyAvailability() {
  console.log("🔍 Testing Kitty availability...\n");

  try {
    const { stdout } = await execFileAsync("which", ["kitty"]);
    console.log("✅ Kitty found at:", stdout.trim());
    return true;
  } catch (error) {
    console.log("❌ Kitty not found in PATH");
    console.log("   Please install Kitty terminal emulator");
    console.log("   Visit: https://sw.kovidgoyal.net/kitty/");
    return false;
  }
}

async function testKittyListCommand() {
  console.log("\n📋 Testing kitty @ ls command...\n");

  try {
    const { stdout } = await execFileAsync("kitty", ["@", "ls"], {
      timeout: 5000,
    });

    console.log("✅ Kitty @ ls command succeeded");
    console.log("\nParsed output:");

    try {
      const data = JSON.parse(stdout);
      const windows = Array.isArray(data) ? data : [data];
      console.log(`Found ${windows.length} window(s)`);

      windows.forEach((win) => {
        console.log(`  Window ${win.id}: ${win.tabs?.length || 0} tab(s)`);
      });
    } catch (e) {
      console.log("   (Could not parse JSON, but command succeeded)");
    }

    if (!stdout.trim()) {
      console.log("\n⚠️  No output - this is normal if Kitty has no open windows");
    }

    return true;
  } catch (error) {
    console.log("❌ Kitty @ ls command failed");
    console.log("   Error:", error.message);
    return false;
  }
}

async function testGetActiveTab() {
  console.log("\n🎯 Testing get-active-window command...\n");

  try {
    const { stdout } = await execFileAsync("kitty", ["@", "ls"], {
      timeout: 5000,
    });

    const data = JSON.parse(stdout);
    const windows = Array.isArray(data) ? data : [data];
    const activeWindow = windows.find((w) => w.is_focused) || windows.find((w) => w.is_active);

    if (activeWindow) {
      console.log("✅ Found active window");
      console.log(`   Window ID: ${activeWindow.id}`);
      console.log(`   Title: ${activeWindow.tabs?.[0]?.title || 'N/A'}`);
    } else {
      console.log("⚠️  No active window found");
    }

    return true;
  } catch (error) {
    console.log("❌ Get-active-window check failed");
    console.log("   Error:", error.message);
    return false;
  }
}

async function testActivateTab() {
  console.log("\n⚡ Testing focus-window command...\n");
  console.log("ℹ️  This test only checks if the command exists");
  console.log("   Actual activation requires a valid window ID\n");

  try {
    // Try with invalid ID to see if command exists
    await execFileAsync("kitty", ["@", "focus-window", "--match", "id:99999"], {
      timeout: 5000,
    });
    console.log("✅ Focus-window command exists");
    return true;
  } catch (error) {
    // Command exists but failed due to invalid ID - this is expected
    if (error.message.includes("No such window") || error.message.includes("not found")) {
      console.log("✅ Focus-window command exists");
      return true;
    }
    console.log("❌ Focus-window command failed");
    console.log("   Error:", error.message);
    return false;
  }
}

async function runAllTests() {
  console.log("========================================");
  console.log("  Kitty API Integration Test Suite");
  console.log("========================================\n");

  const results = [];

  results.push(await testKittyAvailability());
  results.push(await testKittyListCommand());
  results.push(await testGetActiveTab());
  results.push(await testActivateTab());

  console.log("\n========================================");
  console.log("  Test Results Summary");
  console.log("========================================\n");

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total} tests`);

  if (passed === total) {
    console.log("\n✅ All tests passed! Kitty integration is ready.");
  } else if (passed >= total / 2) {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
  } else {
    console.log("\n❌ Most tests failed. Please check your Kitty installation.");
  }

  console.log("\n========================================\n");
}

runAllTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exit(1);
});
