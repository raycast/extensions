// Test-only stub for `@raycast/api`.
//
// The real package has no resolvable entry point outside the Raycast runtime
// (Raycast injects the implementation), so vitest cannot import it. vitest is
// configured (vitest.config.ts) to alias `@raycast/api` to this file for tests.
// Only the surface area that src/ touches under test needs to exist here.
export const environment = { assetsPath: "/fake/assets" };
