import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { client } from "../api/client";
import { Organization } from "../types/organization";
import { match } from "ts-pattern";
import { ContractResponses } from "../api/contract";

async function handleErrors(response: Promise<ContractResponses["getOrganization"]>) {
  return match(await response)
    .with({ status: 401 }, ({ body }) => {
      throw new Error(body.errors[0].detail);
    })
    .otherwise(() => {
      return response;
    });
}

export function useOrganization(options?: { execute?: boolean }) {
  const { data, isLoading, error, ...others } = useCachedPromise(
    async () => handleErrors(client.getOrganization()),
    [],
    options
  );

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
    organizationError: error,
    ...others,
  };
}
