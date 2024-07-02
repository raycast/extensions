import { useEffect, useState } from "react";
import { validate } from "uuid";
import { getWorkspace, queryWorkspace } from "../api/ddb-client";

export type Workspace = {
  id: string;
  name: string;
  integrations: {
    instagram: {
      facebookPageId: string;
      accountName: string;
      connectedAt: string;
      enableRecurringNotifications: boolean;
      isConnected: boolean;
      optinMode: string;
      businessAccountId: string;
      firstTimeConnectedAt: string;
      pageAccessToken: string;
    };
  };
  chargebee: {
    metadata: {
      syncedAt: string;
      isEligible: boolean;
      enabled: boolean;
    };
    companyName: string;
    lastSyncTentative: string;
    contactsBracketSync: {
      isEligible: false;
      enabled: boolean;
    };
    workspaceMrr: 1500;
    trial: {
      isActive: boolean;
      endAt: string;
      leftInSeconds: 17719476;
      startAt: string;
    };
    enabled: boolean;
    customerMrr: 1500;
    activeSince: string;
    hasUnpaidInvoices: boolean;
    subscriptionStatus: string;
    plan: string;
    nextBillingAt: string;
  };
};

const queryOrGetWorkspace = async (search: string): Promise<Workspace[]> => {
  const isValidUUID = validate(search);
  if (isValidUUID) {
    const workspace = await getWorkspace(search);
    return workspace ? [workspace as Workspace] : [];
  } else {
    return queryWorkspace({ name: search }) as Promise<Workspace[]>;
  }
};

export const useSearchWorkspace = (search: string) => {
  const [searchState, setSearchState] = useState<{ data: Workspace[]; error?: string; isLoading: boolean }>({
    data: [],
    error: undefined,
    isLoading: false,
  });

  console.log(searchState);

  useEffect(() => {
    const searchWorkspace = async () => {
      console.log("searchWorkspace", search);
      setSearchState({ data: [], error: undefined, isLoading: true });
      try {
        const workspaces = await queryOrGetWorkspace(search.trim());
        setSearchState((searchState) => ({ ...searchState, data: workspaces, error: undefined }));
      } catch (err) {
        setSearchState((searchState) => ({
          ...searchState,
          error: err instanceof Error ? err.message : JSON.stringify(err),
        }));
      } finally {
        setSearchState((searchState) => ({ ...searchState, isLoading: false }));
      }
    };
    searchWorkspace();
  }, [search, setSearchState]);

  return searchState;
};
