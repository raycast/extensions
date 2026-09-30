// ESLint v9 configuration for Raycast extensions
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
  },
  // Raycast-specific rules would go here
  prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Common Raycast-specific rules
      'react/prop-types': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
]; 