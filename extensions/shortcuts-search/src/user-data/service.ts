import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeJwtClaims } from "../auth/jwt";
import type { FavoriteIdentifier } from "./favorites";
import { matchesFavorite, toFavoriteInsert } from "./favorites";
import { mapCustomizations, mapFavorites, mapProfile } from "./mappers";
import type { Favorite, UserCustomizations, UserProfile } from "./models";
import { getUserDataClient } from "./supabase-client";

export interface NewProfile {
  clerkUserId: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UserDataRepository {
  findProfileByClerkId(clerkUserId: string): Promise<UserProfile | null>;
  createProfile(profile: NewProfile): Promise<UserProfile>;
  getCustomizations(profileId: string): Promise<UserCustomizations>;
  getFavorites(profileId: string): Promise<Favorite[]>;
  addFavorite(profileId: string, identifier: FavoriteIdentifier): Promise<Favorite>;
  removeFavorite(profileId: string, favoriteId: string): Promise<void>;
}

export interface UserDataState {
  profile: UserProfile;
  customizations: UserCustomizations;
  favorites: Favorite[];
}

export class UserDataService {
  constructor(private readonly repository: UserDataRepository) {}

  async load(accessToken: string): Promise<UserDataState> {
    const profile = await this.ensureProfile(accessToken);
    const [customizations, favorites] = await Promise.all([
      this.repository.getCustomizations(profile.id),
      this.repository.getFavorites(profile.id),
    ]);

    return {
      profile,
      customizations,
      favorites,
    };
  }

  async toggleFavorite(accessToken: string, identifier: FavoriteIdentifier): Promise<boolean> {
    const profile = await this.ensureProfile(accessToken);
    const favorites = await this.repository.getFavorites(profile.id);
    const existing = favorites.find((favorite) => matchesFavorite(favorite, identifier));

    if (existing) {
      await this.repository.removeFavorite(profile.id, existing.id);
      return false;
    }

    await this.repository.addFavorite(profile.id, identifier);
    return true;
  }

  private async ensureProfile(accessToken: string): Promise<UserProfile> {
    const claims = decodeJwtClaims(accessToken);
    const existing = await this.repository.findProfileByClerkId(claims.sub);
    if (existing) {
      return existing;
    }

    return this.repository.createProfile({
      clerkUserId: claims.sub,
      displayName: claims.name ?? claims.email?.split("@")[0],
      avatarUrl: claims.picture,
    });
  }
}

export class SupabaseUserDataRepository implements UserDataRepository {
  constructor(private readonly clientProvider: () => SupabaseClient) {}

  async findProfileByClerkId(clerkUserId: string): Promise<UserProfile | null> {
    const { data, error } = await this.clientProvider()
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapProfile(data) : null;
  }

  async createProfile(profile: NewProfile): Promise<UserProfile> {
    const { data, error } = await this.clientProvider()
      .from("profiles")
      .insert({
        clerk_user_id: profile.clerkUserId,
        display_name: profile.displayName ?? null,
        avatar_url: profile.avatarUrl ?? null,
      })
      .select("*")
      .single();

    if (!error) {
      return mapProfile(data);
    }

    if (error.code === "23505") {
      const existing = await this.findProfileByClerkId(profile.clerkUserId);
      if (existing) return existing;
    }

    throw error;
  }

  async getCustomizations(profileId: string): Promise<UserCustomizations> {
    const [appsResult, keymapsResult, shortcutsResult] = await Promise.all([
      this.clientProvider()
        .from("custom_apps")
        .select(
          `
          *,
          custom_keymaps (
            *,
            custom_sections (
              *,
              custom_shortcuts (*)
            )
          )
        `
        )
        .eq("user_id", profileId),
      this.clientProvider()
        .from("custom_keymaps")
        .select(
          `
          *,
          custom_sections (
            *,
            custom_shortcuts (*)
          )
        `
        )
        .eq("user_id", profileId)
        .not("base_app_slug", "is", null),
      this.clientProvider()
        .from("custom_shortcuts")
        .select("*")
        .eq("user_id", profileId)
        .not("base_app_slug", "is", null),
    ]);

    if (appsResult.error) throw appsResult.error;
    if (keymapsResult.error) throw keymapsResult.error;
    if (shortcutsResult.error) throw shortcutsResult.error;

    return mapCustomizations({
      customApps: appsResult.data ?? [],
      baseKeymaps: keymapsResult.data ?? [],
      overlays: shortcutsResult.data ?? [],
    });
  }

  async getFavorites(profileId: string): Promise<Favorite[]> {
    const { data, error } = await this.clientProvider()
      .from("favorites")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return mapFavorites(data ?? []);
  }

  async addFavorite(profileId: string, identifier: FavoriteIdentifier): Promise<Favorite> {
    const { data, error } = await this.clientProvider()
      .from("favorites")
      .insert(toFavoriteInsert(profileId, identifier))
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505" || error.code === "23514") {
        const existing = (await this.getFavorites(profileId)).find((row) => matchesFavorite(row, identifier));
        if (existing) return existing;
      }
      throw error;
    }
    return mapFavorites([data])[0];
  }

  async removeFavorite(profileId: string, favoriteId: string): Promise<void> {
    const { error } = await this.clientProvider()
      .from("favorites")
      .delete()
      .eq("id", favoriteId)
      .eq("user_id", profileId);

    if (error) throw error;
  }
}

function serviceFor(token: string): UserDataService {
  const client = getUserDataClient(token);
  return new UserDataService(new SupabaseUserDataRepository(() => client));
}
export const userDataService = {
  load: (token: string) => serviceFor(token).load(token),
  toggleFavorite: (token: string, identifier: FavoriteIdentifier) =>
    serviceFor(token).toggleFavorite(token, identifier),
};
