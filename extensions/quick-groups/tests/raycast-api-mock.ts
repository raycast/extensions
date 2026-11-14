/** Minimal runtime surface for unit tests; production builds use the real Raycast API. */
export const Icon = new Proxy<Record<string, string>>(
  {},
  { get: (_target, property) => String(property) },
);

function TestAction() {
  return null;
}

export const Action = new Proxy<Record<string, typeof TestAction>>({}, { get: () => TestAction });

export const environment = { supportPath: "/tmp/quick-groups-support" };
