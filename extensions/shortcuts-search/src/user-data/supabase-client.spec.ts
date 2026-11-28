import { createUserDataClient } from "./supabase-client";

describe("Supabase user-data client", () => {
  it("uses only public configuration and the current Clerk access token", async () => {
    const accessToken = jest.fn(async () => "clerk-access-token");
    const client = { from: jest.fn() };
    const factory = jest.fn(() => client);

    expect(createUserDataClient(accessToken, factory)).toBe(client);
    expect(factory).toHaveBeenCalledWith(
      "https://pnzstacjwokxqvtxoeyp.supabase.co",
      "sb_publishable_GHLB33MvQoaygSAZun4Hiw_kr7CWzWl",
      {
        accessToken,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        realtime: {
          transport: expect.any(Function),
        },
      }
    );
  });
});
