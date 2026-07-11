import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getActiveOrg, listOrgs, setActiveOrg } from "./orgs";
import { SalesforceOrg } from "./types";

export function useSalesforceOrgs(): {
  orgs: SalesforceOrg[];
  activeOrg?: SalesforceOrg;
  isLoading: boolean;
  error?: Error;
  selectOrg: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [orgs, setOrgs] = useState<SalesforceOrg[]>([]);
  const [activeOrg, setActive] = useState<SalesforceOrg>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const loaded = await listOrgs();
      setOrgs(loaded);
      setActive(await getActiveOrg(loaded));
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error(String(caught));
      setError(nextError);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to load Salesforce orgs",
        message: nextError.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectOrg = useCallback(
    async (orgId: string) => {
      const selected = orgs.find((org) => org.orgId === orgId);
      if (!selected) return;
      await setActiveOrg(orgId);
      setActive(selected);
    },
    [orgs],
  );

  return { orgs, activeOrg, isLoading, error, selectOrg, refresh };
}
