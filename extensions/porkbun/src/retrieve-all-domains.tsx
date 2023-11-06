import { List, ActionPanel, Action, Icon, showToast, Toast, Color, launchCommand, LaunchType } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Domain, RetrieveAllDomainsResponse } from "./utils/types";
import { retrieveAllDomains } from "./utils/api";
import { API_DOCS_URL } from "./utils/constants";
import GetNameServersComponent from "./components/GetNameServersComponent";
import GetURLForwardingComponent from "./components/url-forwarding/GetURLForwardingComponent";

export default function RetrieveAllDomains() {
  const [isLoading, setIsLoading] = useState(false);
  const [domains, setDomains] = useCachedState<Domain[]>("domains");
  const [filteredDomains, filterDomains] = useState<Domain[]>();
  const [filter, setFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  
  const callApi = async () => {
    setIsLoading(true);
    const response = await retrieveAllDomains() as RetrieveAllDomainsResponse;
    if (response.status === "SUCCESS") {
      setDomains(response.domains);
      showToast({
        style: Toast.Style.Success,
        title: "SUCCESS",
        message: `Fetched ${response.domains.length} domains`,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    callApi();
  }, []);

  useEffect(() => {
    (() => {
      if (!domains) return;
        const domainsWithSearchText = domains.filter(item => item.domain.includes(searchText));
        filterDomains(!filter ? domainsWithSearchText : domainsWithSearchText.filter(item => {
          if (filter==="status_active")
            return item.status==="ACTIVE";
          else if (filter==="status_null")
            return !item.status;
        }));
    })();
  }, [domains, filter, searchText])

  const sectionTitle = domains && `Total: ${domains.length} | Filtered: ${filteredDomains?.length}`;
  
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action icon={Icon.Redo} title="Reload Domains" onAction={callApi} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Go to API Reference"
            url={`${API_DOCS_URL}Domain%20List%20All`}
          />
        </ActionPanel>
      }
      searchBarPlaceholder="Search domain"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Active" value="status_active" />
            <List.Dropdown.Item title="null" value="status_null" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
    >
      <List.Section title={sectionTitle}>
      {filteredDomains && filteredDomains.map(item => <List.Item key={item.domain} title={item.domain}
      icon={getFavicon(`https://${item.domain}`, { fallback: Icon.Globe })}
      accessories={[
        { tag: { value: `status: ${item.status}`, color: item.status==="ACTIVE" ? Color.Green : Color.Yellow } }
      ]}
      actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.domain} />
                <Action.Push title="Get Name Servers" icon={Icon.AppWindowGrid3x3} target={<GetNameServersComponent domain={item.domain} />} />
                <Action.Push title="Get URL Forwarding" icon={Icon.Forward} target={<GetURLForwardingComponent domain={item.domain} />} />
                <Action icon={Icon.Redo} title="Reload Domains" onAction={callApi} />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Go to API Reference"
                  url={`${API_DOCS_URL}Domain%20List%20All`}
                />
                <ActionPanel.Section>
                  <Action title="Retrieve SSL Bundle" icon={Icon.Lock} onAction={async () => await launchCommand({ name: "retrieve-ssl-bundle", type: LaunchType.UserInitiated, arguments: { domain: item.domain } })} />
                </ActionPanel.Section>
              </ActionPanel>
            } detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link title="Domain" text={item.domain} target={item.domain} />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item text={`${item.status}`} color={item.status==="ACTIVE" ? Color.Green : Color.Yellow} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Link title="TLD" text={item.tld} target={`https://porkbun.com/tld/${item.tld}`} />
              <List.Item.Detail.Metadata.Label title="Create Date" text={item.createDate || undefined} icon={!item.createDate ? Icon.Minus : undefined} />
              <List.Item.Detail.Metadata.Label title="Expire Date" text={item.expireDate || undefined} icon={!item.expireDate ? Icon.Minus : undefined} />
              <List.Item.Detail.Metadata.Label title="Security Lock" icon={item.securityLock==="1" ? Icon.Check : Icon.Multiply} />
              <List.Item.Detail.Metadata.Label title="Whois Privacy" icon={item.whoisPrivacy==="1" ? Icon.Check : Icon.Multiply} />
              <List.Item.Detail.Metadata.Label title="Auto Renew" icon={item.autoRenew==="1" ? Icon.Check : Icon.Multiply} />
              <List.Item.Detail.Metadata.Label title="Not Local" icon={item.notLocal==="1" ? Icon.Check : Icon.Multiply} />
            </List.Item.Detail.Metadata>} />} /> )}
      </List.Section>
    </List>
  );
}
