import { fetchResource } from "./loaders";

export interface Zone {
  id: string;
  name: string;
  state: string;
}

interface ApiZone {
  jakimCode: string;
  negeri: string;
  daerah: string;
}

export async function extractZones(): Promise<Zone[] | undefined> {
  return fetchResource({
    url: "https://api.waktusolat.app/zones",
    errorTitle: "Unable to load prayer zones",
    parseResponse: async (response) => {
      const zones = ((await response.json()) as ApiZone[])
        .map((z) => ({ id: z.jakimCode, name: z.daerah, state: z.negeri }))
        .filter(({ id, name }) => !!id && !!name);

      if (zones.length === 0) {
        throw new Error("No prayer zones were found in the response");
      }

      return zones;
    },
  });
}
