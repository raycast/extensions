module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parser: "@babel/eslint-parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    requireConfigFile: false,
    babelOptions: {
      presets: ["@babel/preset-react"],
    },
  },
  rules: {
    // Basic rules
    "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z]" }],
    "no-console": "off",
    "prefer-const": "warn",
    "no-var": "error",

    // General code quality
    eqeqeq: "warn",
    curly: "warn",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",

    // JSX specific rules
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
  },
};
