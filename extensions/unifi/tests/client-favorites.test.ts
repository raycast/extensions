import { describe, expect, it } from "vitest";
import type { NetworkClient } from "../src/api/types";
import { parseFavoriteClients, resolveClientPresence } from "../src/lib/client-favorites";

const wireless = (id: string, name: string): NetworkClient => ({
  access: {},
  id,
  name,
  type: "WIRELESS",
});

describe("favorite client presence", () => {
  it("keeps missing favorites visible and refreshes connected favorites from live data", () => {
    const savedOnline = wireless("online", "Old name");
    const savedOffline = wireless("offline", "Printer");
    const liveOnline = { ...wireless("online", "Phone"), ipAddress: "192.168.1.20" };
    const other = wireless("other", "Laptop");

    expect(resolveClientPresence([liveOnline, other], [savedOffline, savedOnline])).toEqual({
      favorites: [
        { client: liveOnline, connected: true },
        { client: savedOffline, connected: false },
      ],
      others: [other],
    });
  });

  it("drops malformed stored entries without losing valid favorites", () => {
    expect(parseFavoriteClients(JSON.stringify([wireless("valid", "Phone"), { id: "broken" }, null]))).toEqual([
      wireless("valid", "Phone"),
    ]);
    expect(parseFavoriteClients("not json")).toEqual([]);
  });
});
