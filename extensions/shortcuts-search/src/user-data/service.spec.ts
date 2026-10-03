import { UserDataService, type NewProfile, type UserDataRepository } from "./service";
import type { Favorite, UserCustomizations, UserProfile } from "./models";

function tokenFor(
  payload: Record<string, unknown> = {
    sub: "user_123",
    iss: "https://clerk.hotkys.com",
    name: "Max",
    picture: "https://example.com/avatar.png",
  }
): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.signature`;
}

const emptyCustomizations: UserCustomizations = {
  customApps: [],
  customKeymaps: [],
  shortcuts: [],
  favorites: [],
};

function profile(): UserProfile {
  return {
    id: "profile-1",
    clerkUserId: "user_123",
    displayName: "Max",
    avatarUrl: "https://example.com/avatar.png",
    createdAt: "2026-07-30T00:00:00Z",
  };
}

function repository(overrides: Partial<UserDataRepository> = {}): UserDataRepository {
  return {
    findProfileByClerkId: jest.fn(async () => profile()),
    createProfile: jest.fn(async () => profile()),
    getCustomizations: jest.fn(async () => emptyCustomizations),
    getFavorites: jest.fn(async () => []),
    addFavorite: jest.fn(async (_profileId, identifier) => ({
      id: "favorite-new",
      userId: "profile-1",
      ...identifier,
    })),
    removeFavorite: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe("UserDataService", () => {
  it("creates the current profile from Clerk claims before loading data", async () => {
    const repo = repository({
      findProfileByClerkId: jest.fn(async () => null),
    });
    const service = new UserDataService(repo);

    const result = await service.load(tokenFor());

    expect(repo.createProfile).toHaveBeenCalledWith({
      clerkUserId: "user_123",
      displayName: "Max",
      avatarUrl: "https://example.com/avatar.png",
    } satisfies NewProfile);
    expect(repo.getCustomizations).toHaveBeenCalledWith("profile-1");
    expect(repo.getFavorites).toHaveBeenCalledWith("profile-1");
    expect(result).toEqual({
      profile: profile(),
      customizations: emptyCustomizations,
      favorites: [],
    });
  });

  it("loads an existing profile without rewriting it", async () => {
    const repo = repository();
    const service = new UserDataService(repo);

    await service.load(tokenFor());

    expect(repo.createProfile).not.toHaveBeenCalled();
  });

  it("adds a favorite when the identity is not stored", async () => {
    const repo = repository();
    const service = new UserDataService(repo);
    const identifier = {
      itemType: "app" as const,
      appSlug: "safari",
    };

    await expect(service.toggleFavorite(tokenFor(), identifier)).resolves.toBe(true);
    expect(repo.addFavorite).toHaveBeenCalledWith("profile-1", identifier);
    expect(repo.removeFavorite).not.toHaveBeenCalled();
  });

  it("removes a matching favorite instead of inserting a duplicate", async () => {
    const existing: Favorite = {
      id: "favorite-1",
      userId: "profile-1",
      itemType: "shortcut",
      appSlug: "safari",
      keymapTitle: "Default",
      sectionTitle: "Tabs",
      shortcutTitle: "New Tab",
      baseShortcutId: "stable-id",
    };
    const repo = repository({
      getFavorites: jest.fn(async () => [existing]),
    });
    const service = new UserDataService(repo);

    await expect(
      service.toggleFavorite(tokenFor(), {
        itemType: "shortcut",
        appSlug: "safari",
        keymapTitle: "Default",
        sectionTitle: "Tabs",
        shortcutTitle: "Renamed New Tab",
        baseShortcutId: "stable-id",
      })
    ).resolves.toBe(false);
    expect(repo.removeFavorite).toHaveBeenCalledWith("profile-1", "favorite-1");
    expect(repo.addFavorite).not.toHaveBeenCalled();
  });
});
