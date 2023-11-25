import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { client } from "../api/client";
import { Membership } from "../types/membership";

export function useMemberships() {
  const { data, isLoading, ...others } = useCachedPromise(async () => client.getMemberships(), []);

  const memberships: Membership[] = useMemo(() => {
    // TODO: manage pagination with `meta` attribute
    return data?.status === 200 ? data.body.memberships : [];
  }, [data]);

  return {
    memberships,
    membershipsLoading: isLoading,
    ...others,
  };
}
