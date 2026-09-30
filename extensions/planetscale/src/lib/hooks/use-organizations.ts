import { usePlanetScaleClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { getServiceTokenAccesses } from "../oauth/client";

export function useOrganizations() {
  const pscale = usePlanetScaleClient();

  const { data: organizations, isLoading: organizationsLoading } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (key) => {
      const response = await pscale.listOrganizations({
        page: 1,
        per_page: 25,
      });

      const serviceTokenAccesses = await getServiceTokenAccesses();
      const allowedOrganizations = serviceTokenAccesses
        .filter((token) => token.resource_type === "Organization")
        .map((token) => token.resource_id);

      return response.data.data.filter((organization) => allowedOrganizations.includes(organization.id));
    },
    ["organizations"],
    {
      initialData: [],
    },
  );
  return { organizations, organizationsLoading };
}
