const base = require('../../jest.base')

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: 'raycast',
  rootDir: __dirname,
  setupFiles: ['<rootDir>/jest.env.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
