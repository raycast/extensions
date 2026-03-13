import { useEffect } from "react";

import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import type { Organization, User } from "@/api/types";
import { useDashApi } from "@/hooks/useDashApi";
import useSharedState from "@/hooks/useSharedState";

const useDenoState = () => {
  const [user, setUser] = useSharedState<User>("user");
  const [organizations, setOrganizations] = useSharedState<Organization[]>("organizations", []);
  const [selectedOrganizationId, setSelectedOrganizationId] = useSharedState<string>("selectedOrganizationId");
  const { getUser, getUserOrganizations } = useDashApi();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !organizations) {
        const selectedOrganizationId = await LocalStorage.getItem<string>("selectedOrganizationId");
        if (selectedOrganizationId) {
          setSelectedOrganizationId(selectedOrganizationId);
        }
        try {
          const fetchedUser = await getUser();
          const fetchedOrganizations = await getUserOrganizations();

          setUser(fetchedUser);
          setOrganizations(fetchedOrganizations);

          if (selectedOrganizationId) {
            const selectedOrganization = fetchedOrganizations.find((o) => o.id === selectedOrganizationId);
            if (!selectedOrganization) {
              setSelectedOrganizationId(fetchedOrganizations[0].id);
            }
          } else {
            setSelectedOrganizationId(fetchedOrganizations[0].id);
          }
        } catch (error) {
          showFailureToast(error, {
            title: "Error fetching data",
          });
        }
      }
    };
    fetchData();
  }, []);

  const updateSelectedOrganization = async (organizationId: string) => {
    const organizationExists = organizations?.find((o) => o.id === organizationId);
    if (organizationExists) {
      setSelectedOrganizationId(organizationId);
      await LocalStorage.setItem("selectedOrganizationId", organizationId);
    } else {
      setSelectedOrganizationId(undefined);
      await LocalStorage.removeItem("selectedOrganizationId");
    }
  };

  return {
    user,
    organizations,
    selectedOrganization: selectedOrganizationId,
    updateSelectedOrganization,
  };
};

export default useDenoState;
