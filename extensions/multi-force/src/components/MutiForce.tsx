import { useEffect, useMemo } from "react";
import { List, showToast } from "@raycast/api";
import { EmptyOrgList } from "./pages";
import { OrgListReducerType, DeveloperOrg } from "../types";
import { useLoadingContext, useMultiForceContext } from "./providers/OrgListProvider";
import { OrgListItem } from "./listItems/OrgListItem";
import { combineOrgList, getOrgList, loadOrgs, orgListsAreDifferent } from "../utils";
import { RECENTLY_USED_SECTION } from "../constants";

// Helper function to get recently used orgs
const getRecentlyUsedOrgs = (orgs: DeveloperOrg[]): DeveloperOrg[] => {
  return orgs
    .filter((org) => org.lastViewedAt && org.lastViewedAt > 0)
    .sort((a, b) => (b.lastViewedAt || 0) - (a.lastViewedAt || 0))
    .slice(0, 3); // Show last 3 used orgs
};

export default function MultiForce() {
  const { orgs, dispatch } = useMultiForceContext();
  const { isLoading, setIsLoading } = useLoadingContext();

  useEffect(() => {
    async function checkForGlobalOrgChanges(storedOrgs: DeveloperOrg[]) {
      //Get Orgs from Salesforce
      const globalOrgs = await getOrgList();
      //If there are no stored orgs, but there are global orgs, use them immediately.
      if (storedOrgs.length === 0 && globalOrgs.length > 0) {
        dispatch({
          type: OrgListReducerType.SET_ORGS,
          setOrgs: combineOrgList(storedOrgs, globalOrgs),
        });
      }
      //If there are orgs in both and they are different alert the user.
      else if (storedOrgs.length > 0 && orgListsAreDifferent(globalOrgs, storedOrgs)) {
        await showToast({
          title: "Org Changes Available",
          message: "Some of your orgs are out of sync with Salesforce.",
          primaryAction: {
            title: "Resolve",
            onAction: (toast) => {
              dispatch({
                type: OrgListReducerType.SET_ORGS,
                setOrgs: combineOrgList(storedOrgs, globalOrgs),
              });
              toast.hide();
            },
          },
        });
      }
      setIsLoading(false);
    }

    //Load any stored orgs first. This is fast and helps show data quickly.
    async function checkStorage() {
      const storedOrgs = await loadOrgs();
      if (storedOrgs.length > 0) {
        dispatch({
          type: OrgListReducerType.SET_ORGS,
          setOrgs: storedOrgs,
        });
        setIsLoading(false);
      }
      //After we get the stored orgs, check if there are differences with the Salesforce CLI tool.
      checkForGlobalOrgChanges(storedOrgs);
    }
    checkStorage();
  }, []);

  const allOrgs = useMemo(() => Array.from(orgs.values()).flat(), [orgs]);
  const recentlyUsedOrgs = useMemo(() => getRecentlyUsedOrgs(allOrgs), [allOrgs]);

  return Array.from(orgs.keys()).length === 0 && !isLoading ? (
    <EmptyOrgList />
  ) : (
    <List isLoading={isLoading}>
      {recentlyUsedOrgs.length > 0 && (
        <List.Section title={RECENTLY_USED_SECTION}>
          {recentlyUsedOrgs.map((org, index) => (
            <OrgListItem key={`recent-${index}`} index={index} org={org} />
          ))}
        </List.Section>
      )}
      {Array.from(orgs.keys())
        .sort()
        .map((key, keyIndex) =>
          orgs.get(key) && orgs.get(key)!.length > 0 ? (
            <List.Section title={key} key={keyIndex}>
              {orgs.get(key)!.map((org, index) => (
                <OrgListItem key={index} index={index} org={org} />
              ))}
            </List.Section>
          ) : null,
        )}
    </List>
  );
}
