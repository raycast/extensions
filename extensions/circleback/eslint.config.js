const { defineConfig } = require('eslint/config')
const raycastConfig = require('@raycast/eslint-config')

module.exports = defineConfig([
  ...raycastConfig,
  {
    ignores: [
      'eslint.config.js',
      'jest.config.js',
      'jest.env.js',
      'raycast-env.d.ts',
    ],
  },
])
