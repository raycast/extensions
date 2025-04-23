module.exports = {
  extends: ["@raycast/eslint-config"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  ignorePatterns: ["node_modules/", "dist/"],
  rules: {
    // Add any custom rules here if needed
  }
}; 