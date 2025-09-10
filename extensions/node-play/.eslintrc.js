module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'off',
  },
};
