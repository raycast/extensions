import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Clear the previous organization's channels immediately (rather than waiting for the
    // new fetch to resolve) so a stale channel from the old organization can never be
    // selected or submitted while the new organization's channels are loading.
    setChannels(undefined);

    if (!selectedOrg) {
      return;
    }

    let cancelled = false;
    setChannelsLoading(true);
    getChannels(selectedOrg.id)
      .then((result) => {
        if (!cancelled) setChannels(result);
      })
      .catch((err) => {
        console.error("Failed to fetch channels:", err);
        if (!cancelled) setChannels(undefined);
      })
      .finally(() => {
        if (!cancelled) setChannelsLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
