import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api";
import { deleteWebsite, listWebsites } from "./utils/api";
import { useEffect, useState } from "react";
import { ListWebsitesResponse, Website } from "./types/websites";
import { DEFAULT_PAGE_FOR_WEBSITES } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";
import { getFavicon } from "@raycast/utils";
import CreateWebsite from "./components/websites/CreateWebsiteComponent";
import ChangeWebsitePHPVersion from "./components/websites/ChangeWebsitePHPVersionComponent";
import ChangeWebsiteLinuxUserPassword from "./components/websites/ChangeWebsiteLinuxUserPasswordComponent";
import ListChildDomains from "./components/child-domains/ListChildDomainsComponent";

export default function ListWebsites() {
  const [isLoading, setIsLoading] = useState(true);
  const [websites, setWebsites] = useState<Website[]>();
  const [error, setError] = useState("");

  async function getFromApi() {
    const response = await listWebsites({ page: DEFAULT_PAGE_FOR_WEBSITES });
    if (response.error_message === "None") {
      const successResponse = response as ListWebsitesResponse;
      const data = typeof successResponse.data === "string" ? JSON.parse(successResponse.data) : successResponse.data;

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${data.length} Websites`);
      setWebsites(data);
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
        title: `Delete website '${websiteName}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await deleteWebsite({ websiteName });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Deleted ${websiteName} successfully`);
        await getFromApi();
      }
    }
  }

  return error ? (
    <ErrorComponent errorMessage={error} />
  ) : (
    <List isLoading={isLoading} isShowingDetail>
      {websites &&
        websites.map((website) => (
          <List.Item
            key={website.domain}
            title={website.domain}
            icon={getFavicon(`https://${website.domain}`, { fallback: Icon.Globe })}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="Domain"
                      text={website.domain}
                      target={`https://${website.domain}`}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Admin Email"
                      text={website.adminEmail}
                      target={`mailto:${website.adminEmail}`}
                    />
                    <List.Item.Detail.Metadata.Label title="IP Address" text={website.ipAddress} />
                    <List.Item.Detail.Metadata.Label title="Admin" text={website.admin} />
                    <List.Item.Detail.Metadata.Label title="Package" text={website.package} />
                    <List.Item.Detail.Metadata.Label title="State" text={website.state} />
                    <List.Item.Detail.Metadata.Label title="Disk Used" text={website.diskUsed} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="List Child Domains"
                  icon={Icon.CircleEllipsis}
                  target={<ListChildDomains masterDomain={website.domain} />}
                />
                <Action.Push
                  title="Change PHP Version"
                  icon={Icon.WrenchScrewdriver}
                  target={
                    <ChangeWebsitePHPVersion childDomain={website.domain} onWebsitePHPVersionChanged={getFromApi} />
                  }
                />
                <Action.Push
                  title="Change Linux User Password"
                  icon={Icon.Key}
                  target={
                    <ChangeWebsiteLinuxUserPassword domain={website.domain} onLinuxUserPasswordChanged={getFromApi} />
                  }
                />
                <ActionPanel.Submenu title="Go To" icon={Icon.ArrowRight}>
                  <Action
                    title="Databases"
                    icon={Icon.Coin}
                    onAction={() =>
                      launchCommand({
                        name: "list-databases-in-domain",
                        type: LaunchType.UserInitiated,
                        arguments: { databaseWebsite: website.domain },
                      })
                    }
                  />
                  <Action
                    title="Email Accounts"
                    icon={Icon.Envelope}
                    onAction={() =>
                      launchCommand({
                        name: "list-email-accounts-in-domain",
                        type: LaunchType.UserInitiated,
                        arguments: { domain: website.domain },
                      })
                    }
                  />
                  <Action
                    title="FTP Accounts"
                    icon={Icon.PersonCircle}
                    onAction={() =>
                      launchCommand({
                        name: "list-ftp-accounts-in-domain",
                        type: LaunchType.UserInitiated,
                        arguments: { selectedDomain: website.domain },
                      })
                    }
                  />
                </ActionPanel.Submenu>
                <ActionPanel.Section>
                  <Action
                    title="Delete Website"
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDelete(website.domain)}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Reload Websites" icon={Icon.Redo} onAction={getFromApi} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Website"
                    icon={Icon.Plus}
                    target={<CreateWebsite onWebsiteCreated={getFromApi} />}
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
            title="Create Website"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Website"
                  icon={Icon.Plus}
                  target={<CreateWebsite onWebsiteCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
