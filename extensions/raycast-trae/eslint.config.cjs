const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = {
  files: ['src/**/*.{js,jsx,ts,tsx}'],
  plugins: {
    '@typescript-eslint': typescriptPlugin
  },
  languageOptions: {
    parser: typescriptParser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      },
      project: './tsconfig.json'
    }
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'prefer-const': 'error',
    '@typescript-eslint/no-unused-vars': 'warn'
  }
};