const typescriptParser = require("@typescript-eslint/parser");
const typescriptPlugin = require("@typescript-eslint/eslint-plugin");
const reactPlugin = require("eslint-plugin-react");

module.exports = [
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
            react: reactPlugin,
        },
        rules: {
            ...typescriptPlugin.configs.recommended.rules,
            "react/jsx-uses-react": "error",
            "react/jsx-uses-vars": "error",
        },
    },
];
