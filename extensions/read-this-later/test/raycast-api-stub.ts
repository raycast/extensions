// Stand-in for the Raycast runtime module during tests. Only the surface
// api.ts actually touches needs to exist here.
export function getPreferenceValues() {
  return { syncToken: "t".repeat(32) };
}
