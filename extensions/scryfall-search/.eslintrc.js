module.exports = {
  "root": true,
  "env": {
    "es2020": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  rules: {
    'id-length': [
      2,
      {
        exceptions: ['_', 'a', 'b', 'c', 'i', 'x', 'y', 'z'],
      },
    ],
    'no-await-in-loop': 0,
    'no-console': [
      'error',
      {
        allow: ['error', 'info'],
      },
    ],
    'no-case-declarations': 0,
    'no-nested-ternary': 0,
    'no-restricted-syntax': [
      'error',
      'FunctionExpression',
      'WithStatement',
      "BinaryExpression[operator='in']",
    ],
  },
};