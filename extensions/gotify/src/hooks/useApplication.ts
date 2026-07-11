import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { z } from "zod";

export const Applications = z.array(
  z.object({
    defaultPriority: z.number(),
    description: z.string(),
    id: z.number(),
    image: z.string(),
    internal: z.boolean(),
    lastUsed: z.string().datetime(),
    name: z.string(),
    token: z.string(),
  }),
);

export function useApplication() {
  const { token, endpoint } = getPreferenceValues<Preferences.Messages>();

  const { data, isLoading } = useFetch<z.infer<typeof Applications>>(`${endpoint}/application`, {
    headers: {
      "X-Gotify-Key": token,
    },
  });

  return {
    applications: data,
    applicationLoading: isLoading,
  };
}
