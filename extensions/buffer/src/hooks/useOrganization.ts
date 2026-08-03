import { useState, useEffect, useCallback } from "react";
import { usePromise } from "@raycast/utils";
import {
  getOrganizations,
  getChannels,
  type Organization,
  type Channel,
} from "../api";

interface UseOrganizationResult {
  organizations: Organization[] | undefined;
  selectedOrg: Organization | undefined;
  needsOrgPicker: boolean;
  selectOrgById: (id: string) => void;
  channels: Channel[] | undefined;
  isLoading: boolean;
}

export function useOrganization(): UseOrganizationResult {
  const [selectedOrg, setSelectedOrg] = useState<Organization | undefined>();
  const [channels, setChannels] = useState<Channel[] | undefined>();
  const [channelsLoading, setChannelsLoading] = useState(false);

  const { data: organizations, isLoading: orgsLoading } =
    usePromise(getOrganizations);

  useEffect(() => {
    if (organizations?.length === 1 && !selectedOrg) {
      setSelectedOrg(organizations[0]);
    }
  }, [organizations]);

  const fetchChannels = useCallback(async (org: Organization) => {
    setChannelsLoading(true);
    try {
      const result = await getChannels(org.id);
      setChannels(result);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
      setChannels(undefined);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchChannels(selectedOrg);
    } else {
      setChannels(undefined);
    }
  }, [selectedOrg]);

  const needsOrgPicker = (organizations?.length ?? 0) > 1;

  function selectOrgById(id: string) {
    const org = organizations?.find((o) => o.id === id);
    if (org) setSelectedOrg(org);
  }

  return {
    organizations,
    selectedOrg,
    needsOrgPicker,
    selectOrgById,
    channels,
    isLoading: orgsLoading || channelsLoading,
  };
}
