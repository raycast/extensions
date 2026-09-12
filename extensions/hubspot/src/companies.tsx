import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  open,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import { useAccountInfo } from "@/hooks/useAccountInfo";
import type { Company } from "@/types/company";

const formatTimestamp = (timestamp?: string): string => (timestamp ? new Date(timestamp).toLocaleString() : "");

const formatPropertyValue = (value: string, formatType?: string): string => {
  if (!value) return "";

  switch (formatType) {
    case "currency": {
      const numValue = parseFloat(value);
      return !isNaN(numValue)
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numValue)
        : value;
    }
    case "date": {
      return new Date(value).toLocaleString();
    }
    case "number": {
      const num = parseFloat(value);
      return !isNaN(num) ? new Intl.NumberFormat("en-US").format(num) : value;
    }
    case "percentage": {
      const pct = parseFloat(value);
      return !isNaN(pct) ? new Intl.NumberFormat("en-US", { style: "percent" }).format(pct / 100) : value;
    }
    default:
      return value;
  }
};

const Detail = ({ company, hubspotUrl }: { company: Company; hubspotUrl: string }) => {
  const preferences = getPreferenceValues();
  const customProperties = preferences.customCompanyProperties
    ? preferences.customCompanyProperties.split(",").map((prop: string) => prop.trim())
    : [];

  const formattingRules = (() => {
    try {
      return JSON.parse(preferences.propertyFormatting || "{}");
    } catch {
      console.error("Failed to parse property formatting rules");
      return {};
    }
  })();

  const name = company?.properties?.name;
  const createdate = formatTimestamp(company?.properties?.createdate);
  const domain = company?.properties?.domain;
  const hs_lastmodifieddate = formatTimestamp(company?.properties?.hs_lastmodifieddate);
  const description = company?.properties?.description;
  const industry = company?.properties?.industry;
  const id = company?.id;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {name && <List.Item.Detail.Metadata.Label title="Name" text={name} />}
          {domain && <List.Item.Detail.Metadata.Link title="Company Domain Name" text={domain} target={domain} />}
          {description && <List.Item.Detail.Metadata.Label title="Description" text={description} />}
          {industry && <List.Item.Detail.Metadata.Label title="Industry" text={industry} />}
          {createdate && (
            <List.Item.Detail.Metadata.Label
              title="Create Date"
              text={formatPropertyValue(createdate, formattingRules["createdate"])}
            />
          )}
          {hs_lastmodifieddate && (
            <List.Item.Detail.Metadata.Label
              title="Last Modified Date"
              text={formatPropertyValue(hs_lastmodifieddate, formattingRules["hs_lastmodifieddate"])}
            />
          )}
          {customProperties.map((prop: string) => {
            const value = company?.properties?.[prop];
            if (value) {
              return (
                <List.Item.Detail.Metadata.Label
                  key={prop}
                  title={prop.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  text={formatPropertyValue(value, formattingRules[prop])}
                />
              );
            }
            return null;
          })}
          {id && <List.Item.Detail.Metadata.Link title="HubSpot Link" text="View in HubSpot" target={hubspotUrl} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const [search, setSearch] = useState("");
  const { isLoading, data } = useCompanies({ search });
  const { isLoading: isLoadingAccountInfo, data: dataAccountInfo } = useAccountInfo();

  const companies: Company[] | undefined = data?.results;

  return (
    <List
      isLoading={isLoading || isLoadingAccountInfo}
      isShowingDetail={showingDetail}
      searchText={search}
      throttle
      onSearchTextChange={(search) => {
        setSearch(search);
      }}
    >
      <List.EmptyView title="No Companies Found" icon="noview.png" />
      {companies?.map((company) => {
        const name = company?.properties?.name;
        const domain = company?.properties?.domain;
        const description = company?.properties?.description;
        const industry = company?.properties?.industry;
        const id = company?.id;
        const hubspotUrl = `https://${dataAccountInfo?.uiDomain}/contacts/${dataAccountInfo?.portalId}/company/${id}`;

        const props = showingDetail
          ? {
              detail: <Detail company={company} hubspotUrl={hubspotUrl} />,
            }
          : {
              accessories: [{ text: domain }, { text: description }],
            };

        return (
          <List.Item
            key={company.id}
            title={name}
            subtitle={industry}
            icon={getFavicon(`https://${domain}`)}
            keywords={[name, domain, description, industry]}
            id={company.id}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Browser"
                  onAction={async () => {
                    await open(hubspotUrl);
                    await closeMainWindow();
                  }}
                  icon={{ source: Icon.ArrowRight }}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                {domain && <Action.OpenInBrowser title="Open Website" url={domain} />}
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
