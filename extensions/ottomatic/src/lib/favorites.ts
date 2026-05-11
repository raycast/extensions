import { useCachedPromise, useCachedState } from "@raycast/utils";
import { fetch } from "cross-fetch";

import { z } from "zod";
import { compact } from "lodash";
import { apiBaseUrl, ottomaticBaseUrl } from "./constants";
import { useJWT } from "./ottomatic";
import { useMemo } from "react";

const favoriteSchema = z.union([z.literal("server"), z.literal("file"), z.literal("url"), z.literal("project")]);
const orgMemberFavoritesRowSchema = z.object({
  created_at: z.string().nullable(),
  filename: z.string().nullable(),
  id: z.coerce.string(),
  name: z.string(),
  org_id: z.number().nullable(),
  project_id: z.number().nullable(),
  server_id: z.number().nullable(),
  type: favoriteSchema,
  url: z.string().nullable(),
  user_id: z.string(),
});

const zFavoriteServer = orgMemberFavoritesRowSchema.extend({
  type: z.literal("server"),
  filename: z.literal(null).optional(),
  filemaker_servers: z.object({
    url: z.string(),
  }),
});
const zFavoriteFile = zFavoriteServer.extend({
  type: z.literal("file"),
  filename: z.string(),
});
const zFavoriteUrl = orgMemberFavoritesRowSchema.extend({
  type: z.literal("url"),
});
const zFavoriteProject = orgMemberFavoritesRowSchema.extend({
  type: z.literal("project"),
  project_id: z.number(),
  projects: z.object({ slug: z.string() }),
});

/**
 * These types have to be declared manually becuase we're doing fancy validation to ensure this format
 */
type FavoriteBase = Omit<
  z.infer<typeof orgMemberFavoritesRowSchema> & {
    filemaker_servers: { url: string } | null;
    orgSlug?: string;
  },
  "org_member_id" | "created_at"
>;

export type OrgMemberFavorite =
  | (FavoriteBase & {
      type: "url";
      url: string;
      filename?: null;
      server_id?: null;
    })
  | (FavoriteBase & {
      type: "server";
      filemaker_servers: { url: string };
      filename?: null;
      url?: null;
    })
  | (FavoriteBase & {
      type: "file";
      filemaker_servers: { url: string };
      filename: string;
      url?: null;
    })
  | (FavoriteBase & {
      type: "project";
      project_id: number;
      orgSlug: string;
      projects: { slug: string };
    });

export function useFavorites() {
  const { rawJWT, data } = useJWT();

  const [_favorites, setFavorites] = useCachedState<OrgMemberFavorite[]>("favorites", []);
  const qr = useCachedPromise(
    async () => {
      const token = rawJWT;
      const result = (await fetch(`${apiBaseUrl}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) {
          console.error("fetch favorites error:", res.statusText);
        }
        return res.json();
      })) as { data: OrgMemberFavorite[] };

      // validate data
      const data =
        result.data?.map((o) => {
          if (o.type === "server") {
            const result = zFavoriteServer.safeParse(o);
            if (!result.success) console.log(result.error.flatten());
            return result.success ? result.data : undefined;
          }
          if (o.type === "file") {
            const result = zFavoriteFile.safeParse(o);
            if (!result.success) console.log(result.error.flatten());
            return result.success ? result.data : undefined;
          }
          if (o.type === "url") {
            const result = zFavoriteUrl.safeParse(o);
            if (!result.success) console.log(result.error.flatten());
            return result.success ? result.data : undefined;
          }
          if (o.type === "project") {
            const result = zFavoriteProject.safeParse(o);
            if (!result.success) console.log(result.error.flatten());
            return result.success ? result.data : undefined;
          }
          return o;
        }) ?? [];

      // remove all undefined from data (in case of validation errors)
      const goodData = data ? compact(data) : [];
      return goodData as OrgMemberFavorite[];
    },
    [],
    { keepPreviousData: true, execute: !!rawJWT, onData: setFavorites },
  );

  const favorites = useMemo(() => {
    const memberships = data?.memberships ?? [];

    const favorites = _favorites.map((fav) => {
      const membership = memberships.find((m) => m.organization.publicMetadata.org_id === fav.org_id);
      return { ...fav, orgSlug: membership?.organization.slug };
    });
    return favorites.map((o) => ({ ...o, launchLink: getLaunchLink(o as OrgMemberFavorite) }));
  }, [_favorites, data]);

  return { ...qr, data: favorites };
}

function getLaunchLink(favorite: OrgMemberFavorite): string | null {
  if (favorite.type === "url") {
    return favorite.url;
  }
  if (favorite.type === "server") {
    if (!favorite.orgSlug) return null;
    return `${ottomaticBaseUrl}/servers/${favorite.orgSlug}/${favorite.server_id}`;
  }
  if (favorite.type === "file") {
    try {
      const hostname = new URL(favorite.filemaker_servers.url).hostname;
      return `fmp://${hostname}/${favorite.filename}`;
    } catch (e) {
      console.error("Error parsing filemaker url", e);
      return null;
    }
  }
  if (favorite.type === "project") {
    return `${ottomaticBaseUrl}/projects/${favorite.orgSlug}/${favorite.projects.slug}`;
  }
  return null;
}
