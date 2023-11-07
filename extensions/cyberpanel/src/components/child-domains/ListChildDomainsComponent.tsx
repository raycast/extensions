import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFavicon } from "@raycast/utils";
import { ChildDomain, ListChildDomainsResponse } from "../../types/child-domains";
import { deleteChildDomain, getChildDomains } from "../../utils/api";
import { PANEL_URL } from "../../utils/constants";
import ErrorComponent from "../ErrorComponent";
import ChangeWebsitePHPVersion from "../websites/ChangeWebsitePHPVersionComponent";
import CreateWebsite from "../websites/CreateWebsiteComponent";

type ListChildDomainsProps = {
  masterDomain: string;
};
export default function ListChildDomains({ masterDomain }: ListChildDomainsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [childDomains, setChildDomains] = useState<ChildDomain[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await getChildDomains({ masterDomain });
    if (response.error_message === "None") {
      const successResponse = response as ListChildDomainsResponse;
      const data = typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Child Domains`);
      setChildDomains(data);
    } else {
      setError(response.error_message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(websiteName: string) {
    if (
      await confirmAlert({
        title: `Delete child domain '${websiteName}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteChildDomain({ websiteName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${websiteName} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading} navigationTitle="List Child Domains">
      {childDomains &&
        childDomains.map((childDomain) => (
          <List.Item
            key={childDomain.childDomain}
            title={childDomain.childDomain}
            subtitle={`path: ${childDomain.path}`}
            icon={getFavicon(`https://${childDomain.childDomain}`, { fallback: Icon.Globe })}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in CyberPanel" url={PANEL_URL + childDomain.childLunch} />
                <Action.Push
                  title="Change PHP Version"
                  icon={Icon.WrenchScrewdriver}
                  target={
                    <ChangeWebsitePHPVersion
                      childDomain={childDomain.childDomain}
                      onWebsitePHPVersionChanged={getFromApi}
                    />
                  }
                />
                <ActionPanel.Section>
                  <Action
                    title="Delete Child Domain"
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDelete(childDomain.childDomain)}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Reload Child Domains" icon={Icon.Redo} onAction={getFromApi} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Child Domain"
                    icon={Icon.Plus}
                    target={<CreateWebsite masterDomain={masterDomain} onWebsiteCreated={getFromApi} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Child Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Child Domain"
                  icon={Icon.Plus}
                  target={<CreateWebsite masterDomain={masterDomain} onWebsiteCreated={getFromApi} />}
                />
                <ActionPanel.Section>
                  <Action title="Reload Child Domains" icon={Icon.Redo} onAction={getFromApi} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
