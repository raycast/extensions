import { useEffect, useState } from "react";
import { deleteSubdomain, getSubdomains } from "../../utils/api";
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { SuccessResponse } from "../../types";
import { getFavicon } from "@raycast/utils";
import CreateSubdomainComponent from "./CreateSubdomainComponent";

type GetSubdomainsComponentProps = {
  domain: string;
  userToImpersonate?: string;
};
export default function GetSubdomainsComponent({ domain, userToImpersonate = "" }: GetSubdomainsComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [subdomains, setSubdomains] = useState<string[]>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getSubdomains(domain, userToImpersonate);
    if (response.error === "0") {
      // this endpoint returns nothing if no subdomains so we handle it
      const list = "list" in response ? (response.list as string[]) : [];
      setSubdomains(list);

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Subdomains`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDeleteSubdomain(subdomain: string) {
    if (
      await confirmAlert({
        title: `Delete subdomain '${subdomain}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      let removeContents = false;
      if (
        await confirmAlert({
          title: "Remove directory and contents?",
          icon: Icon.QuestionMark,
          primaryAction: { title: "Yes" },
          dismissAction: { title: "No" },
        })
      )
        removeContents = true;

      const response = await deleteSubdomain(
        {
          action: "delete",
          domain,
          select0: subdomain,
          contents: removeContents ? "yes" : "no",
        },
        userToImpersonate,
      );
      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        await getFromApi();
      }
    }
  }

  return (
    <List navigationTitle="Get Subdomains" isLoading={isLoading}>
      {subdomains &&
        subdomains.map((subdomain) => (
          <List.Item
            key={subdomain}
            title={subdomain}
            subtitle={`.${domain}`}
            icon={getFavicon(`https://${subdomain}.${domain}`, { fallback: Icon.Globe })}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Subdomain"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDeleteSubdomain(subdomain)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Subdomain"
                    icon={Icon.Plus}
                    target={
                      <CreateSubdomainComponent
                        domain={domain}
                        onSubdomainCreated={getFromApi}
                        userToImpersonate={userToImpersonate}
                      />
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Subdomain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Subdomain"
                  icon={Icon.Plus}
                  target={
                    <CreateSubdomainComponent
                      domain={domain}
                      onSubdomainCreated={getFromApi}
                      userToImpersonate={userToImpersonate}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
