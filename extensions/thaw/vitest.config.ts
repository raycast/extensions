import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.test.ts",
				"src/test/**",
				// Raycast command/UI entry points — covered via shared utils/data instead
				"src/**/*.tsx",
			],
		},
	},
	resolve: {
		alias: {
			"@utils": path.resolve(__dirname, "src/utils"),
			"@data": path.resolve(__dirname, "src/data"),
		},
	},
});
