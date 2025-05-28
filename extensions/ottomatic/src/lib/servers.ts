import { useCachedPromise, useCachedState } from "@raycast/utils";
import { fetch } from "cross-fetch";
import { useJWT } from "./ottomatic";
import { z } from "zod";
import { apiBaseUrl } from "./constants";
import { useMemo } from "react";
import sampleData from "./sample-servers.json";

const fmserverConnectionTypeSchema = z.union([z.literal("privateKey"), z.literal("ottoAdminApiKey")]);
const osSchema = z.union([z.literal("mac"), z.literal("windows"), z.literal("linux")]);

// used only for screenshots
const showSampleData = false;

const filemakerServersRowSchema = z
  .object({
    auth_error: z.boolean(),
    cert_expire_timestamp: z.string().nullable(),
    connection_error: z.boolean(),
    connection_type: fmserverConnectionTypeSchema.nullable(),
    created_at: z.string().nullable(),
    created_by: z.string().nullable(),
    fms_version: z.string().nullable(),
    gemba_id: z.string().nullable(),
    id: z.number(),
    location: z.string(),
    metadata: z
      .object({
        ottoServerTag: z.enum(["dev", "stg", "prod"]).nullable(),
        ottoThemeColor: z.string().nullable(),
      })
      .catch({ ottoServerTag: null, ottoThemeColor: null }),
    name_friendly: z.string().nullable(),
    org_id: z.number(),
    os: osSchema.nullable(),
    otto_admin_api_key: z.string().nullable(),
    otto_port: z.number(),
    otto_version: z.string().nullable(),
    ottomatic_status: z.string().nullable(),
    ottomatic_url: z.string().nullable(),
    url: z.string(),
    vultr_id: z.string().nullable(),
  })
  .pick({
    id: true,
    url: true,
    org_id: true,
    name_friendly: true,
    connection_error: true,
    auth_error: true,
    ottomatic_status: true,
    fms_version: true,
    otto_version: true,
    location: true,
    os: true,
    metadata: true,
  })
  .extend({ isOttomatic: z.boolean() });

type TServer = z.infer<typeof filemakerServersRowSchema>;
export function useServers() {
  const { rawJWT, data } = useJWT();
  const memberships = data?.memberships ?? [];

  const [_servers, setServers] = useCachedState<TServer[]>("servers", []);
  const qr = useCachedPromise(
    async () => {
      const data = await fetch(`${apiBaseUrl}/servers`, {
        headers: { Authorization: `Bearer ${rawJWT}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        })
        .catch((e) => {
          console.error("fetch servers error:", e);
          throw e;
        });

      return z.object({ data: filemakerServersRowSchema.array() }).parse(data).data;
    },
    [],
    { execute: !!rawJWT, keepPreviousData: true, onData: setServers },
  );

  const servers = useMemo(() => {
    const data = showSampleData ? sampleData : _servers;
    return data.map((server) => {
      const mem = memberships.find((m) => m.organization.publicMetadata.org_id === server.org_id);
      return { ...server, org_slug: mem?.organization.slug };
    });
  }, [_servers]);

  return { ...qr, data: servers };
}
