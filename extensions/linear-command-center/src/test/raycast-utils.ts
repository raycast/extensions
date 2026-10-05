// Stand-in for @raycast/utils under Vitest. Tests replace these with vi.mock.
export const getAccessToken = () => ({ token: "" });
export const OAuthService = { linear: () => ({}) };
