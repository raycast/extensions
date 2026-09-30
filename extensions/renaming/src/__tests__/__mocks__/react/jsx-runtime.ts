/**
 * Mock for react/jsx-runtime (and react/jsx-dev-runtime)
 *
 * Compiled JSX imports this module under the automatic runtime. See the
 * "react" mock for why a stub is needed.
 */

export const Fragment = Symbol.for("react.fragment");

export function jsx(type: unknown, props?: unknown, key?: unknown): unknown {
  return { type, props, key };
}

export const jsxs = jsx;
export const jsxDEV = jsx;
