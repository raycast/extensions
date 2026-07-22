// Lightweight CJS stand-in for `node-fetch` used only by Jest (`jest.config.js`
// `moduleNameMapper`). `node-fetch` is ESM-only, which Jest can't load without extra transform
// config, and the unit tests under `src/` never actually perform network requests, so we swap in
// this mock instead of teaching Jest to transform the real ESM package.
function fetch() {
  throw new Error("fetch() is not available in the Jest test environment. Mock the caller instead.");
}

module.exports = fetch;
module.exports.default = fetch;
// Node's global `Response`/`Headers` (from undici) are API-compatible with node-fetch's.
module.exports.Response = globalThis.Response;
module.exports.Headers = globalThis.Headers;
