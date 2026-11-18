import { beforeEach, describe, expect, it, vi } from "vitest";
import { rememberUsername, USERNAME_KEY } from "./username";

const store = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    setItem: async (key: string, value: string) => void store.set(key, value),
  },
}));

describe("rememberUsername", () => {
  beforeEach(() => store.clear());

  it("stores the username as JSON, which is how useLocalStorage reads it back", async () => {
    await rememberUsername("https://dev-null.sh/@chrismessina/commits/01a164c4");
    // useLocalStorage() runs JSON.parse on the stored string.
    expect(JSON.parse(store.get(USERNAME_KEY) ?? "")).toBe("chrismessina");
  });

  it("stores nothing for a URL that isn't a commit", async () => {
    await rememberUsername("https://example.com/@chrismessina/commits/1");
    await rememberUsername(undefined);
    expect(store.size).toBe(0);
  });
});
