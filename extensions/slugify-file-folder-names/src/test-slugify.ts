import { slugify, generateSlugFilename } from "./utils/slugify";

// Test cases to validate the slugify function
const testCases = [
  // Special characters
  { input: "Çılgın Değişim", expected: "cilgin-degisim" },
  { input: "İşçi Ğöğebakan Ürünü", expected: "isci-gogebakan-urunu" },
  { input: "Şöförün Ütüsü", expected: "soforun-utusu" },

  // File with extension
  { input: "Çılgın %50 İndirim!.pdf", expected: "cilgin-50-indirim.pdf" },
  { input: "Résumé Document.docx", expected: "resume-document.docx" },

  // International characters
  { input: "café résumé", expected: "cafe-resume" },
  { input: "naïve piñata", expected: "naive-pinata" },
  { input: "Zürich Straße", expected: "zurich-strasse" },

  // Special characters and spaces
  { input: "Hello World!", expected: "hello-world" },
  { input: "My File (copy).txt", expected: "my-file-copy.txt" },
  { input: "test___file---name.jpg", expected: "test-file-name.jpg" },
  { input: "file@#$%name.png", expected: "filename.png" },

  // Edge cases
  { input: "   spaces   ", expected: "spaces" },
  { input: "---hyphens---", expected: "hyphens" },
  { input: "UPPERCASE", expected: "uppercase" },
  { input: "123numbers", expected: "123numbers" },

  // The example from your specification
  { input: "%Çılgın %50 İndirim! (Şimdi Başla)", expected: "cilgin-50-indirim-simdi-basla" },
];

// Run tests
console.log("Testing slugify function...\n");

let passedTests = 0;
const totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = slugify(testCase.input, { preserveExtension: true });
  const passed = result === testCase.expected;

  if (passed) {
    passedTests++;
  }

  console.log(`Test ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Input:    "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got:      "${result}"`);
  if (!passed) {
    console.log(`  ❌ Mismatch!`);
  }
  console.log("");
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);

// Test filename generation function
console.log("\nTesting generateSlugFilename function...\n");

const filenameTests = [
  { input: "My Document.pdf", expected: "my-document.pdf" },
  { input: "Café Files", expected: "cafe-files" },
  { input: "folder name", expected: "folder-name" },
];

filenameTests.forEach((testCase, index) => {
  const result = generateSlugFilename(testCase.input, true);
  const passed = result === testCase.expected;

  console.log(`Filename Test ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Input:    "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got:      "${result}"`);
  console.log("");
});

export { testCases };
