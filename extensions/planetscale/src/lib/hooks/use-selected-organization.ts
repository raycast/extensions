import { useCachedState } from "@raycast/utils";
import { useOrganizations } from "./use-organizations";
import { useEffect } from "react";

export function useSelectedOrganization() {
  const [organization, setOrganization] = useCachedState<string>("organization");
  const { organizations, organizationsLoading } = useOrganizations();

  useEffect(() => {
    const defaultOrganization = organizations?.[0]?.name;
    if (!organizationsLoading && !organization && defaultOrganization) {
      setOrganization(defaultOrganization);
    }
  }, [organizationsLoading, organization, organizations]);

  return [organization, setOrganization] as const;
}
