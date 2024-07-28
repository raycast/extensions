import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, popToRoot, Detail } from "@raycast/api";
import { AuthenticateNewOrg } from "./components/AuthenticateNewOrg";
import { DeveloperOrg } from "./models/models";
import { openOrg, getOrgList, deleteOrg } from "./utils/sf";
import { loadOrgs, saveOrgs } from "./utils/storage-management";
import { EmptyOrgList } from "./components/EmptyOrgList";
export default function Command() {
  const [orgs, setOrgs] = useState<DeveloperOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStorage() {
      console.log("Initializing App");
      const storedOrgs = await loadOrgs();
      if (storedOrgs) {
        console.log("Has Orgs");
        setOrgs(storedOrgs);
      } else {
        console.log("Has homebrew path but no orgs");
        refreshOrgs();
      }
      setIsLoading(false);
    }
    checkStorage();
  }, []);

  const handleOrgSelection = async (orgAlias: string) => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${orgAlias}`,
    });
    await openOrg(orgAlias);
    setIsLoading(false);
    toast.hide();
    popToRoot();
  };

  const refreshOrgs = async () => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing your orgs.",
    });

    // Fetch the new list of orgs
    const newOrgs = await getOrgList();

    // Create a map from the new orgs for quick lookup
    const newOrgsMap = new Map(newOrgs.map((org) => [org.username, org]));

    // Filter the existing orgs to include only those that exist in the new list
    const updatedOrgs = orgs.filter((org) => newOrgsMap.has(org.username));

    // Merge the existing org fields with the new org fields
    const mergedOrgs = updatedOrgs.map((org) => ({
      ...org,
      ...newOrgsMap.get(org.username),
    }));

    // Add new orgs that are not present in the existing list
    const additionalOrgs = newOrgs.filter((org) => !orgs.some((existingOrg) => existingOrg.username === org.username));

    // Combine merged orgs and additional new orgs
    const combinedOrgs = [...mergedOrgs, ...additionalOrgs];

    // Sort the combined list by alias
    combinedOrgs.sort((a, b) => a.alias.localeCompare(b.alias));

    // Update the orgs state
    setOrgs(combinedOrgs);
    saveOrgs(combinedOrgs);
    setIsLoading(false);
    toast.hide();
  };

  const handleOrgDeletion = async (org: DeveloperOrg) => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${org.alias}`,
    });
    await deleteOrg(org.username);
    await refreshOrgs();
    setIsLoading(false);
    toast.hide();
  };


  return (
    orgs.length === 0 ?
    <EmptyOrgList/>
    :
    <List isLoading={isLoading}>
      {orgs.map((org, index) => (
        <List.Item
          key={index}
          icon="list-icon.png"
          title={org.alias ? `${org.alias} (${org.username})` : org.username}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => handleOrgSelection(org.alias)} />
              {/* <Action.Push
                title="Open Details"
                target={<OrgDetails />}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              /> */}
              <Action
                title="Refresh Org List"
                onAction={() => refreshOrgs()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.Push
                title="Authenticate a New Org"
                target={<AuthenticateNewOrg />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Delete Org"
                onAction={() => handleOrgDeletion(org)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
