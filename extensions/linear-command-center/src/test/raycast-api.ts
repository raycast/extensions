// Stand-in for @raycast/api under Vitest: the real package only resolves
// inside Raycast. Tests replace these with vi.mock.
export const getPreferenceValues = () => ({});
