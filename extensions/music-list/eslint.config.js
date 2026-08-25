const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
	{
		ignores: ["node_modules/**", ".git/**", "dist/**", "build/**", "coverage/**"],
	},
	...raycastConfig,
]);
