import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  extends: [tseslint.configs.recommended],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
  },
});
