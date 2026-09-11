// Minimal @raycast/api stub for unit tests. The pure lib/ modules under
// test only touch the Icon / Image / Color values from @raycast/api, and
// only to store or return them. Icon is a Proxy so any `Icon.Foo`
// resolves to the string "Foo", which is enough to assert *which* glyph a
// resolver picked without coupling the tests to Raycast's real enum
// values. Real @raycast/api doesn't import cleanly outside the Raycast
// runtime, which is why this alias exists (see vitest.config.ts).

export const Icon: Record<string, string> = new Proxy(
  {},
  { get: (_target, key) => String(key) },
) as Record<string, string>;

export const Image = { Mask: { Circle: "circle" } };

// Only used in a type-position cast (`hex as Color`) at runtime, so its
// shape doesn't matter; exported so the value import resolves.
export const Color: Record<string, string> = {};
