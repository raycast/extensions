module.exports = {
  extends: ["@raycast"],
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    node: true,
    es6: true,
  },
  ignorePatterns: ["dist", "node_modules"],
};
