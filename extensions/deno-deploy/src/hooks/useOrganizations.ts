import { useMemo } from "react";

import type { Organization, User } from "@/api/types";
import useDenoState from "@/hooks/useDenoState";

export interface UseOrganizationsOptions {
  onTeamChange?: () => void;
}

export type OrganizationWithDisplayName = Organization & { displayName: string };

const withDisplayName = (org: Organization, user?: User): OrganizationWithDisplayName => {
  const displayName = org.name ?? (user ? (user.id === org.id ? `${user?.name} (personal)` : "<unnamed>") : "");
  return {
    ...org,
    displayName,
  };
};

export const useOrganizations = (opts?: UseOrganizationsOptions) => {
  const { onTeamChange } = useMemo(() => opts || {}, [opts]);
  const { user, selectedOrganization, organizations, updateSelectedOrganization } = useDenoState();

  const update = async (organizationId: string) => {
    if (!organizationId) {
      return;
    }
    await updateSelectedOrganization(organizationId);
    if (onTeamChange) {
      onTeamChange();
    }
  };

  const organization = useMemo(() => {
    const org = (organizations || []).find((org) => org.id === selectedOrganization);
    return org ? withDisplayName(org, user) : undefined;
  }, [organizations, selectedOrganization]);

  const otherOrganizations = useMemo(
    () =>
      (organizations || []).filter((org) => org.id !== selectedOrganization).map((org) => withDisplayName(org, user)),
    [organizations, selectedOrganization],
  );

  return {
    organization,
    otherOrganizations,
    update,
  };
};
