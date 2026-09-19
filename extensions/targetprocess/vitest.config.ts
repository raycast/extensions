import { defineConfig } from "vitest/config";

// Only src/api is tested: it is the layer with real logic and no Raycast imports.
// Commands and components are verified by running the extension, not by mounting React.
export default defineConfig({
  test: {
    include: [
      "src/api/**/*.test.ts",
      "src/instances/**/*.test.ts",
      "src/filters/**/*.test.ts",
      "src/format/**/*.test.ts",
    ],
    environment: "node",
  },
});
