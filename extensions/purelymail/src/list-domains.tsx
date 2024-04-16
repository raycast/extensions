import {
  ActionPanel,
  Action,
  List,
  Icon,
  launchCommand,
  LaunchType,
  Color,
  Alert,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

import { deleteDomain, getDomains } from "./utils/api";
import { Domain, Response } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function ListDomains() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [domains, setDomains] = useCachedState<Domain[]>("domains");
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const [filter, setFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  async function getFromApi() {
    setIsLoading(true);
    const response: Response = await getDomains(true);

    if (response.type === "error") {
      setError(response.message);
    } else {
      setDomains(response.result.domains);
      await showToast({
        title: "SUCCESS",
        message: `Fetched ${response.result.domains?.length} domains`,
      });
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getFromApi();
  }, []);

  const toggleShowDetails = () => {
    setIsShowingDetails(!isShowingDetails);
  };

  const handleDelete = async (domain: string) => {
    if (
      await confirmAlert({
        title: `Delete ${domain}?`,
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        message: "You will not be able to recover it",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);

      const response = await deleteDomain(domain);
      if (response.type === "error") {
        await showToast(Toast.Style.Success, "Domain Deleted", "DOMAIN: " + domain);
        getFromApi();
      }
      setIsLoading(false);
    }
  };

  const updateDomainSettings = async (domain: Domain) => {
    setIsLoading(true);
    if (domain.isShared) {
      await showToast(Toast.Style.Failure, "Purelymail Error", "Can't Edit Shared Domains.");
    } else {
      await launchCommand({
        name: "update-domain-settings",
        type: LaunchType.UserInitiated,
        arguments: {
          domain: domain.name,
        },
      });
    }
    setIsLoading(false);
  };

  const filteredDomains = !domains
    ? []
    : domains
        .filter((domain) => domain.name.includes(searchText))
        .filter((domain) => {
          if (filter === "domains_shared") return domain.isShared;
          if (filter === "domains_custom") return !domain.isShared;
          if (filter.includes("tld_")) return domain.name.split(".").pop() === filter.slice(4);
          return domain;
        });

  const domainsTitle = `${filteredDomains.length} of ${domains?.length || 0} domains`;

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for domain..."
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetails}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Domain Type" onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Item title="All Domains" value="" icon={Icon.Dot} />
          <List.Dropdown.Section title="Shared">
            <List.Dropdown.Item
              title="Shared Domains"
              value="domains_shared"
              icon={{ source: Icon.Globe, tintColor: Color.Green }}
            />
            <List.Dropdown.Item
              title="Custom Domains"
              value="domains_custom"
              icon={{ source: Icon.Globe, tintColor: Color.Red }}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="TLD">
            {[...new Set(domains?.map((domain) => domain.name.split(".").pop()))].map((tld) => (
              <List.Dropdown.Item key={tld} title={`.${tld}`} value={`tld_${tld}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={domainsTitle}>
        {filteredDomains.map((domain) => (
          <List.Item
            key={domain.name}
            icon={getFavicon(`https://${domain.name}`, { fallback: Icon.List })}
            title={domain.name}
            accessories={
              isShowingDetails
                ? undefined
                : [
                    { tag: { value: "isShared", color: domain.isShared ? Color.Green : Color.Red } },
                    { text: { value: "" }, icon: Icon.Minus },
                    { tag: { value: "MX", color: domain.dnsSummary.passesMx ? Color.Green : Color.Red } },
                    { tag: { value: "SPF", color: domain.dnsSummary.passesSpf ? Color.Green : Color.Red } },
                    { tag: { value: "DKIM", color: domain.dnsSummary.passesDkim ? Color.Green : Color.Red } },
                    { tag: { value: "DMARC", color: domain.dnsSummary.passesDmarc ? Color.Green : Color.Red } },
                  ]
            }
            actions={
              <ActionPanel>
                <Action title="Toggle Details" icon={Icon.AppWindowSidebarRight} onAction={toggleShowDetails} />
                <Action title="Update Domain Settings" icon={Icon.Gear} onAction={() => updateDomainSettings(domain)} />
                <Action
                  title="Create User"
                  icon={Icon.AddPerson}
                  onAction={async () => {
                    await launchCommand({
                      name: "create-user",
                      type: LaunchType.UserInitiated,
                      arguments: {
                        domain: domain.name,
                      },
                    });
                  }}
                />
                <Action
                  title="Delete Domain"
                  onAction={() => handleDelete(domain.name)}
                  icon={Icon.DeleteDocument}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Name"
                      icon={getFavicon(`https://${domain.name}`)}
                      text={domain.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Allow Account Reset"
                      icon={domain.allowAccountReset ? Icon.Check : Icon.Multiply}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Symbolic Subaddressing"
                      icon={domain.symbolicSubaddressing ? Icon.Check : Icon.Multiply}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Is Shared"
                      icon={domain.isShared ? Icon.Check : Icon.Multiply}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="DNS Summary">
                      {Object.entries(domain.dnsSummary).map(([key, val]) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={key}
                          text={key.replace("passes", "").toUpperCase()}
                          color={val ? Color.Green : Color.Red}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
      <List.Section title="Commands">
        <List.Item
          title="Add New Domain"
          icon={{ source: Icon.Plus }}
          actions={
            <ActionPanel>
              <Action
                title="Add New Domain"
                icon={Icon.Plus}
                onAction={async () => {
                  await launchCommand({ name: "add-domain", type: LaunchType.UserInitiated });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
