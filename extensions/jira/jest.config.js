/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
  // `test/request.test.ts` uses Node's built-in `node:test` runner (run separately via
  // `node --test`), not Jest, so it's excluded here to avoid duplicate/incompatible execution.
  roots: ["<rootDir>/src"],
  // `node-fetch` is ESM-only and unused at runtime by the `src/` unit tests, so it's swapped
  // for a lightweight CJS mock instead of configuring Jest to transform the real ESM package.
  moduleNameMapper: {
    "^node-fetch$": "<rootDir>/test/mocks/node-fetch.js",
  },
};
