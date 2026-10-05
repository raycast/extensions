const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");
const importPlugin = require("eslint-plugin-import");
const prettierPlugin = require("eslint-plugin-prettier");
const promisePlugin = require("eslint-plugin-promise");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const tseslint = require("typescript-eslint");

module.exports = defineConfig([
    {
        ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"],
    },
    ...raycast.flat(),
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.eslint.json",
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            import: importPlugin,
            promise: promisePlugin,
            prettier: prettierPlugin,
        },
        settings: {
            react: {
                version: "detect",
            },
            "import/resolver": {
                typescript: {
                    project: "./tsconfig.eslint.json",
                },
            },
        },
        rules: {
            "prettier/prettier": "error",

            "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
            "@typescript-eslint/ban-ts-comment": [
                "error",
                {
                    "ts-expect-error": "allow-with-description",
                    "ts-ignore": true,
                    "ts-nocheck": true,
                    "ts-check": false,
                    minimumDescriptionLength: 10,
                },
            ],
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "separate-type-imports" },
            ],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                { accessibility: "no-public" },
            ],
            "@typescript-eslint/no-confusing-void-expression": [
                "error",
                { ignoreArrowShorthand: true },
            ],
            "@typescript-eslint/no-empty-function": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
            "@typescript-eslint/no-import-type-side-effects": "error",
            "@typescript-eslint/no-misused-promises": [
                "error",
                { checksVoidReturn: { attributes: false } },
            ],
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-redundant-type-constituents": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                { allowNumber: true, allowBoolean: true, allowNullish: true },
            ],
            "@typescript-eslint/return-await": ["error", "in-try-catch"],
            "@typescript-eslint/strict-boolean-expressions": [
                "error",
                {
                    allowString: false,
                    allowNumber: false,
                    allowNullableObject: false,
                    allowNullableBoolean: false,
                    allowNullableString: false,
                    allowNullableNumber: false,
                    allowAny: false,
                },
            ],
            "@typescript-eslint/switch-exhaustiveness-check": "error",

            curly: ["error", "all"],
            "default-case-last": "error",
            "default-param-last": "error",
            "dot-notation": "error",
            eqeqeq: ["error", "always"],
            "lines-between-class-members": ["error", "always"],
            "no-alert": "error",
            "no-console": ["error", { allow: ["warn", "error"] }],
            "no-else-return": ["error", { allowElseIf: false }],
            "no-implicit-coercion": "error",
            "no-nested-ternary": "error",
            "no-param-reassign": "error",
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "../../context/devices",
                            importNames: ["useDevicesContext"],
                            message:
                                "Reusable action components must use useOptionalDevicesContext instead.",
                        },
                    ],
                },
            ],
            "no-return-await": "off",
            "no-void": ["error", { allowAsStatement: true }],
            "object-shorthand": ["error", "always"],
            "prefer-const": "error",
            "prefer-template": "error",
            "require-await": "error",
            yoda: "error",

            "import/no-cycle": "error",
            "import/no-default-export": "off",
            "import/no-duplicates": "error",
            "import/no-extraneous-dependencies": [
                "error",
                {
                    devDependencies: [
                        "**/*.test.ts",
                        "**/*.test.tsx",
                        "test/**/*",
                        "jest.config.js",
                    ],
                },
            ],
            // Disabled until eslint-plugin-import supports ESLint 10's SourceCode API.
            "import/order": "off",

            "promise/always-return": "off",
            "promise/catch-or-return": "error",

            "react/jsx-no-useless-fragment": "error",
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
            "react-hooks/exhaustive-deps": "error",
            "react-hooks/rules-of-hooks": "error",
        },
    },
    {
        files: ["**/*.d.ts"],
        rules: {
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
        },
    },
    {
        files: ["**/*.test.ts", "**/*.test.tsx", "test/**/*"],
        languageOptions: {
            globals: {
                afterEach: "readonly",
                beforeEach: "readonly",
                describe: "readonly",
                expect: "readonly",
                it: "readonly",
                jest: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-deprecated": "off",
            "@typescript-eslint/no-empty-function": "off",
            "no-console": "off",
        },
    },
]);
