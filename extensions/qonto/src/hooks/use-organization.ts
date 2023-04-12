import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { client } from "../api/client";
import { Organization } from "../types/organization";

export function useOrganization(options?: { execute?: boolean }) {
  const { data, isLoading, ...others } = useCachedPromise(client.getOrganization, [], options);

  const organization = useMemo(() => {
    if (data?.status !== 200) return undefined;

    const organization = data.body.organization;
    const bankAccounts = data.body.organization.bank_accounts;

    // Sort bank accounts by balance
    const orgaBankAccountsSorted: Organization = {
      ...organization,
      bank_accounts: bankAccounts.sort((a, b) => (a.balance > b.balance ? -1 : 1)),
    };

    return orgaBankAccountsSorted;
  }, [data]);

  return {
    organization,
    organizationLoading: isLoading,
    ...others,
  };
}
