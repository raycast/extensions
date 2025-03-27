import { List, ActionPanel, Action, Icon, showToast, Toast, Color, launchCommand, LaunchType } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Domain } from "./utils/types";
import { retrieveAllDomains } from "./utils/api";
import { API_DOCS_URL, TLD_SVG_BASE_URL } from "./utils/constants";
import GetNameServersComponent from "./components/name-servers/GetNameServersComponent";
import GetURLForwardingComponent from "./components/url-forwarding/GetURLForwardingComponent";

export default function RetrieveAllDomains() {
  const [isLoading, setIsLoading] = useState(false);
  const [domains, setDomains] = useCachedState<Domain[]>("domains");
  const [filteredDomains, filterDomains] = useState<Domain[]>();
  const [filter, setFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  const callApi = async () => {
    setIsLoading(true);
    const response = await retrieveAllDomains();
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
      const domainsWithSearchText = domains.filter((item) => item.domain.includes(searchText));
      filterDomains(
        !filter
          ? domainsWithSearchText
          : domainsWithSearchText.filter((item) => {
              if (filter === "status_active") return item.status === "ACTIVE";
              else if (filter === "status_null") return !item.status;
              else if (filter.includes("tld_")) return item.tld === filter.slice(4);
            }),
      );
    })();
  }, [domains, filter, searchText]);

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
          <List.Dropdown.Item title="All" icon={Icon.CircleProgress100} value="" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item
              title="Active"
              icon={{ source: Icon.Dot, tintColor: Color.Green }}
              value="status_active"
            />
            <List.Dropdown.Item title="null" icon={{ source: Icon.Dot, tintColor: Color.Yellow }} value="status_null" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="TLD">
            {[...new Set(domains?.map((domain) => domain.tld))].map((tld) => (
              <List.Dropdown.Item
                key={tld}
                icon={{ source: `${TLD_SVG_BASE_URL}${tld}.svg`, fallback: "porkbun.png" }}
                title={tld}
                value={`tld_${tld}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
    >
      <List.Section title={sectionTitle}>
        {filteredDomains &&
          filteredDomains.map((item) => (
            <List.Item
              key={item.domain}
              title={item.domain}
              icon={getFavicon(`https://${item.domain}`, { fallback: Icon.Globe })}
              accessories={[
                {
                  tag: {
                    value: `status: ${item.status}`,
                    color: item.status === "ACTIVE" ? Color.Green : Color.Yellow,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://${item.domain}`} />
                  <Action.Push
                    title="Get Name Servers"
                    icon={Icon.AppWindowGrid3x3}
                    target={<GetNameServersComponent domain={item.domain} />}
                  />
                  <Action.Push
                    title="Get URL Forwarding"
                    icon={Icon.Forward}
                    target={<GetURLForwardingComponent domain={item.domain} />}
                  />
                  <ActionPanel.Submenu title="Go to" icon={Icon.ArrowRight}>
                    <Action
                      title="Retrieve DNS Records"
                      icon={Icon.Text}
                      onAction={() =>
                        launchCommand({
                          name: "retrieve-dns-records",
                          type: LaunchType.UserInitiated,
                          context: { domain: item.domain },
                        })
                      }
                    />
                    <Action
                      title="Delete DNS Record"
                      icon={Icon.DeleteDocument}
                      onAction={() =>
                        launchCommand({
                          name: "delete-dns-record",
                          type: LaunchType.UserInitiated,
                          context: { domain: item.domain },
                        })
                      }
                    />
                    <Action
                      title="Create DNS Record"
                      icon={Icon.Plus}
                      onAction={() =>
                        launchCommand({
                          name: "create-dns-record",
                          type: LaunchType.UserInitiated,
                          context: { domain: item.domain },
                        })
                      }
                    />
                    <Action
                      title="Edit DNS Record"
                      icon={Icon.Pencil}
                      onAction={() =>
                        launchCommand({
                          name: "edit-dns-record",
                          type: LaunchType.UserInitiated,
                          context: { domain: item.domain },
                        })
                      }
                    />
                    <Action
                      title="Retrieve SSL Bundle"
                      icon={Icon.Lock}
                      onAction={async () =>
                        await launchCommand({
                          name: "retrieve-ssl-bundle",
                          type: LaunchType.UserInitiated,
                          arguments: { domain: item.domain },
                        })
                      }
                    />
                  </ActionPanel.Submenu>
                  <Action icon={Icon.Redo} title="Reload Domains" onAction={callApi} />
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      icon={Icon.Globe}
                      title="Go to API Reference"
                      url={`${API_DOCS_URL}Domain%20List%20All`}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link title="Domain" text={item.domain} target={item.domain} />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${item.status}`}
                          color={item.status === "ACTIVE" ? Color.Green : Color.Yellow}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Link
                        title="TLD"
                        text={item.tld}
                        target={`https://porkbun.com/tld/${item.tld}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Create Date"
                        text={item.createDate || undefined}
                        icon={!item.createDate ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Expire Date"
                        text={item.expireDate || undefined}
                        icon={!item.expireDate ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Security Lock"
                        icon={item.securityLock === "1" ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Whois Privacy"
                        icon={item.whoisPrivacy === "1" ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Auto Renew"
                        icon={item.autoRenew === "1" ? Icon.Check : Icon.Multiply}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Not Local"
                        icon={item.notLocal === "1" ? Icon.Check : Icon.Multiply}
                      />
                      {"labels" in item ? (
                        <List.Item.Detail.Metadata.TagList title="Labels">
                          {item.labels?.map((label) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={label.id}
                              text={label.title}
                              color={label.color}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Labels" icon={Icon.Minus} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
