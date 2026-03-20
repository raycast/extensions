const js = require('@eslint/js')
const tseslint = require('typescript-eslint')

module.exports = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ['dist/**', 'node_modules/**'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json'
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
})

