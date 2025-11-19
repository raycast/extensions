const raycastConfig = require("@raycast/eslint-config");

// Flatten the config array to fix nested array issue
const flattenedRaycastConfig = raycastConfig.flat();

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
	...flattenedRaycastConfig,
	{
		files: ["**/*.ts", "**/*.tsx"],
		rules: {
			// Disable TypeScript rules that conflict with Raycast API JSX components
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			// Disable React JSX compatibility warnings for Raycast components
			"react/jsx-no-undef": "off",
			"react/no-unescaped-entities": "off",
			// TypeScript ban-ts-comment configuration
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-ignore": "allow-with-description",
					"ts-expect-error": "allow-with-description",
					"ts-nocheck": "allow-with-description",
				},
			],
		},
	},
];
