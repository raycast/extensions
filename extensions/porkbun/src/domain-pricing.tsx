import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Fragment, useEffect, useState } from "react";
import { type DomainPricing, Response } from "./utils/types";
import { API_DOCS_URL, API_URL, TLD_SVG_BASE_URL } from "./utils/constants";

export default function DomainPricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [domainPricing, setDomainPricing] = useCachedState<DomainPricing>("domain-pricing");
  const [updatedOn, setUpdatedOn] = useCachedState<Date>("updatedOn");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("");
  const [filteredList, filterList] = useState<DomainPricing>();
  const [confirmReloadDomains, setConfirmReloadDomains] = useState(false);

  const callApi = async () => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching Domain Pricing",
    });
    try {
      const response = await fetch(API_URL + "pricing/get");
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Unknown Error");
      const result = (await response.json()) as Response;
      if (result.status === "ERROR") throw new Error(result.message);
      toast.style = Toast.Style.Success;
      toast.title = "SUCCESS";
      toast.message = `Fetched ${result.pricing && Object.keys(result.pricing).length + " "}domains`;
      setDomainPricing(result.pricing);
      setUpdatedOn(new Date());
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "ERROR";
      toast.message = `${error}`;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    function doFilter() {
      if (domainPricing) {
        const f = Object.entries(domainPricing).filter(([domain, pricing]) => {
          if (domain.includes(searchText)) {
            if (filter === "has_coupons") return Object.values(pricing.coupons).length;
            else if (filter === "no_coupons") return !Object.values(pricing.coupons).length;
            else return true;
          }
          return false;
        });

        filterList(Object.fromEntries(f));
      }
    }

    async function filterOrCallApi() {
      if (domainPricing) {
        if (!confirmReloadDomains) {
          setConfirmReloadDomains(true);
          if (Math.floor((Number(new Date()) - Number(updatedOn)) / (1000 * 60 * 60 * 24)) > 0) {
            if (
              await confirmAlert({
                title: "Reload domain pricing?",
                message: "It has been at least 24 hours since domain pricing was last fetched.",
                primaryAction: { title: "Reload" },
              })
            ) {
              await callApi();
            }
          }
        }
        doFilter();
      } else {
        await callApi();
      }
    }
    filterOrCallApi();
  }, [searchText, filter, domainPricing]);

  const on = `Updated On: ${updatedOn ? updatedOn.toDateString() : "..."}`;
  const total = `Total: ${domainPricing ? Object.keys(domainPricing).length : "..."}`;
  const filtered = `Filtered: ${
    filteredList ? Object.keys(filteredList).length : domainPricing ? Object.keys(domainPricing).length : "..."
  }`;
  const navigationTitle = `${on} | ${total} | ${filtered}`;

  const formatStringAsCurrency = (value: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          {!isLoading && <Action icon={Icon.Redo} title="Reload Domain Pricing" onAction={callApi} />}
          <Action.OpenInBrowser icon={Icon.Globe} title="Go to API Reference" url={`${API_DOCS_URL}Domain%20Pricing`} />
        </ActionPanel>
      }
      searchBarPlaceholder="Search domain by name"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Section title="Coupons">
            <List.Dropdown.Item title="Has Coupons" value="has_coupons" />
            <List.Dropdown.Item title="No Coupons" value="no_coupons" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
    >
      {filteredList &&
        Object.entries(filteredList).map(([domain, pricing]) => (
          <List.Item
            icon={{
              source: `${TLD_SVG_BASE_URL}${domain}.svg`,
              fallback: "porkbun.png",
            }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://porkbun.com/tld/${domain}`} />
                {!isLoading && <Action icon={Icon.Redo} title="Reload Domain Pricing" onAction={callApi} />}
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    title="Go to API Reference"
                    url={`${API_DOCS_URL}Domain%20Pricing`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            key={domain}
            title={domain}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Registration"
                      text={formatStringAsCurrency(pricing.registration)}
                    />
                    <List.Item.Detail.Metadata.Label title="Renewal" text={formatStringAsCurrency(pricing.renewal)} />
                    <List.Item.Detail.Metadata.Label title="Transfer" text={formatStringAsCurrency(pricing.transfer)} />
                    {pricing.specialType ? (
                      <List.Item.Detail.Metadata.TagList title="Special Type">
                        <List.Item.Detail.Metadata.TagList.Item text={pricing.specialType} />
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Special Type" icon={Icon.Minus} />
                    )}
                    {Object.keys(pricing.coupons).length ? (
                      <List.Item.Detail.Metadata.TagList title="Coupons">
                        {Object.entries(pricing.coupons).map(([, details]) => (
                          <List.Item.Detail.Metadata.TagList.Item key={details.code} text={details.code} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Coupons" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {Object.entries(pricing.coupons).map(([name, details], index) => (
                      <Fragment key={name}>
                        <List.Item.Detail.Metadata.Label title={details.code} />
                        <List.Item.Detail.Metadata.Label title="Max Per User" text={details.max_per_user.toString()} />
                        <List.Item.Detail.Metadata.Label title="First Year Only" text={details.first_year_only} />
                        <List.Item.Detail.Metadata.Label title="Type" text={details.type} />
                        <List.Item.Detail.Metadata.Label
                          title="Amount"
                          text={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                            details.amount,
                          )}
                        />
                        {index !== Object.keys(pricing.coupons).length - 1 && (
                          <List.Item.Detail.Metadata.Label title="" icon={Icon.Ellipsis} />
                        )}
                      </Fragment>
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
