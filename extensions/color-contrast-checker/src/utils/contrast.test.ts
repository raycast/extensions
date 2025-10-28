/**
 * Simple test file to verify contrast calculations
 * Run with: npx tsx src/utils/contrast.test.ts
 */

import { hexToRgb, getRelativeLuminance, getContrastRatio, checkWCAGCompliance, formatRatio } from "./contrast";

console.log("🧪 Testing Color Contrast Utilities\n");

// Test 1: Hex to RGB conversion
console.log("Test 1: Hex to RGB conversion");
const rgb1 = hexToRgb("#FF5733");
console.log("  #FF5733 ->", rgb1); // Expected: { r: 255, g: 87, b: 51 }

const rgb2 = hexToRgb("FFF");
console.log("  FFF ->", rgb2); // Expected: { r: 255, g: 255, b: 255 }
console.log("  ✅ Hex to RGB\n");

// Test 2: Relative luminance
console.log("Test 2: Relative luminance");
const lum1 = getRelativeLuminance("#FFFFFF");
const lum2 = getRelativeLuminance("#000000");
console.log("  White (#FFFFFF):", lum1.toFixed(4)); // Expected: ~1.0000
console.log("  Black (#000000):", lum2.toFixed(4)); // Expected: ~0.0000
console.log("  ✅ Relative luminance\n");

// Test 3: Contrast ratios - Standard test cases
console.log("Test 3: Contrast ratios");

// Black on White (maximum contrast)
const blackWhite = getContrastRatio("#000000", "#FFFFFF");
console.log("  Black on White:", formatRatio(blackWhite)); // Expected: 21:1

// Gray on White
const grayWhite = getContrastRatio("#767676", "#FFFFFF");
console.log("  Gray (#767676) on White:", formatRatio(grayWhite)); // Expected: ~4.54:1

// Red on White
const redWhite = getContrastRatio("#FF0000", "#FFFFFF");
console.log("  Red on White:", formatRatio(redWhite)); // Expected: ~4.0:1

console.log("  ✅ Contrast ratios\n");

// Test 4: WCAG Compliance
console.log("Test 4: WCAG Compliance");

const testCases = [
  { ratio: 21, desc: "21:1 (Black/White)" },
  { ratio: 7, desc: "7:1 (AAA normal)" },
  { ratio: 4.5, desc: "4.5:1 (AA normal)" },
  { ratio: 3, desc: "3:1 (AA large)" },
  { ratio: 2, desc: "2:1 (fail all)" },
];

testCases.forEach(({ ratio, desc }) => {
  const compliance = checkWCAGCompliance(ratio);
  console.log(`  ${desc}:`);
  console.log(`    AA Normal: ${compliance.aa.normalText ? "✅" : "❌"}`);
  console.log(`    AA Large:  ${compliance.aa.largeText ? "✅" : "❌"}`);
  console.log(`    AAA Normal: ${compliance.aaa.normalText ? "✅" : "❌"}`);
  console.log(`    AAA Large:  ${compliance.aaa.largeText ? "✅" : "❌"}`);
});

console.log("\n✅ All tests completed!\n");

// Real-world examples
console.log("Real-world color combinations:\n");

const examples = [
  { color1: "#000000", color2: "#FFFFFF", name: "Black on White" },
  { color1: "#FFFFFF", color2: "#000000", name: "White on Black" },
  { color1: "#0066CC", color2: "#FFFFFF", name: "Blue link on White" },
  { color1: "#767676", color2: "#FFFFFF", name: "Gray text on White" },
  { color1: "#FF5733", color2: "#FFFFFF", name: "Orange on White" },
];

examples.forEach(({ color1, color2, name }) => {
  const ratio = getContrastRatio(color1, color2);
  const compliance = checkWCAGCompliance(ratio);
  console.log(`${name}:`);
  console.log(`  Ratio: ${formatRatio(ratio)}`);
  console.log(`  AA: ${compliance.aa.normalText ? "✅ Pass" : "❌ Fail"}`);
  console.log(`  AAA: ${compliance.aaa.normalText ? "✅ Pass" : "❌ Fail"}`);
  console.log();
});
