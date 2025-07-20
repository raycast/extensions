// Test file to demonstrate the usage of custom platform CRUD utilities
// This file can be run to test the functionality

import { addCustomApp, updateCustomApp, removeCustomApp, platformExists } from "./custom-platform-utils";

/**
 * Test the CRUD operations for custom platforms
 */
export async function testCustomPlatformCRUD() {
  console.log("Testing Custom Platform CRUD utilities...\n");

  // Test 1: Add a new custom platform
  console.log("1. Testing addCustomApp...");
  const addResult1 = await addCustomApp({
    name: "My Custom Network",
    urlTemplate: "https://mycustomnetwork.com/{profile}",
    enabled: true,
  });
  console.log("Add result 1:", addResult1);

  // Test 2: Try to add duplicate (should fail with validation)
  console.log("\n2. Testing duplicate prevention...");
  const addResult2 = await addCustomApp({
    name: "My Custom Network", // Same name, should fail
    urlTemplate: "https://different.com/{profile}",
    enabled: true,
  });
  console.log("Add result 2 (should fail):", addResult2);

  // Test 3: Add with special characters (should be slug-safe)
  console.log("\n3. Testing slug-safe generation...");
  const addResult3 = await addCustomApp({
    name: "My Special@Network#123!",
    urlTemplate: "https://special.com/{profile}",
    enabled: false,
  });
  console.log("Add result 3:", addResult3);

  // Test 4: Try to add with invalid URL template (should fail)
  console.log("\n4. Testing URL validation...");
  const addResult4 = await addCustomApp({
    name: "Invalid URL Test",
    urlTemplate: "https://invalid.com/user", // Missing {profile}
    enabled: true,
  });
  console.log("Add result 4 (should fail):", addResult4);

  // Test 5: Update an existing platform
  if (addResult1.success && addResult1.value) {
    console.log("\n5. Testing updateCustomApp...");
    const updateResult = await updateCustomApp(addResult1.value, {
      name: "My Updated Custom Network",
      urlTemplate: "https://updated.com/{profile}",
      enabled: false,
    });
    console.log("Update result:", updateResult);
  }

  // Test 6: Check if platforms exist
  console.log("\n6. Testing platformExists...");
  console.log("GitHub exists:", await platformExists("github"));
  console.log("Non-existent platform exists:", await platformExists("nonexistent"));

  // Test 7: Remove a platform
  if (addResult3.success && addResult3.value) {
    console.log("\n7. Testing removeCustomApp...");
    const removeResult = await removeCustomApp(addResult3.value);
    console.log("Remove result:", removeResult);
  }

  console.log("\nCustom Platform CRUD testing completed!");
}

/**
 * Test validation edge cases
 */
export async function testValidationEdgeCases() {
  console.log("Testing validation edge cases...\n");

  // Test empty name
  console.log("1. Testing empty name...");
  const result1 = await addCustomApp({
    name: "",
    urlTemplate: "https://example.com/{profile}",
  });
  console.log("Empty name result:", result1);

  // Test name with only special characters
  console.log("\n2. Testing name with only special characters...");
  const result2 = await addCustomApp({
    name: "!@#$%^&*()",
    urlTemplate: "https://example.com/{profile}",
  });
  console.log("Special chars only result:", result2);

  // Test conflicting with default platforms
  console.log("\n3. Testing conflict with default platform name...");
  const result3 = await addCustomApp({
    name: "GitHub", // This should conflict with default GitHub platform
    urlTemplate: "https://mygithub.com/{profile}",
  });
  console.log("Conflict with default result:", result3);

  // Test extremely long name
  console.log("\n4. Testing extremely long name...");
  const result4 = await addCustomApp({
    name: "A".repeat(100) + " Network",
    urlTemplate: "https://example.com/{profile}",
  });
  console.log("Long name result:", result4);

  console.log("\nValidation edge case testing completed!");
}

// Example usage (commented out to avoid automatic execution):
// testCustomPlatformCRUD();
// testValidationEdgeCases();
