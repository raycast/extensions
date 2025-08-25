import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            react: reactPlugin,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
        },
    },
];
