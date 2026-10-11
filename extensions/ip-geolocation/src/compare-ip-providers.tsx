import { Action, ActionPanel, Icon, List, LaunchProps } from "@raycast/api";
import { useMemo, useState } from "react";
import { PublicIpError, useCompareProviders } from "./hooks/useCompareProviders";
import { formatOverallSummary, formatProviderSummary, getCountryFlag } from "./utils/ip-providers";
import { IpEmptyView } from "./components/ip-empty-view";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { ProviderResult } from "./types/ip-providers";

export default function CompareIpProviders(props: LaunchProps<{ arguments: Arguments.CompareIpProviders }>) {
  const ipAddress = props.arguments?.ipAddress;
  const [searchContent, setSearchContent] = useState<string>(ipAddress ? ipAddress.trim() : "");
  const { data, isLoading, error } = useCompareProviders(searchContent);

  const results = useMemo(() => data?.results || [], [data]);
  const summary = data?.summary;
  const targetIp = data?.ip || searchContent;

  const summaryTitle = useMemo(() => {
    if (!summary?.country) {
      return "No country data";
    }
    const flag = getCountryFlag(summary.countryCode);
    return flag ? `${flag} ${summary.country}` : summary.country;
  }, [summary]);

  const summarySubtitle = useMemo(() => {
    if (!summary) {
      return "";
    }
    if (summary.disagree) {
      return "Providers disagree on the country";
    }
    return `${summary.agreeing} of ${summary.responding} providers agree`;
  }, [summary]);

  const summaryIcon = useMemo(() => {
    if (!summary || summary.disagree || !summary.countryCode) {
      return Icon.ExclamationMark;
    }
    return Icon.CheckCircle;
  }, [summary]);

  const renderProviderSubtitle = (result: ProviderResult) => {
    if (!result.ok) {
      return result.error || "Lookup failed";
    }
    const flag = getCountryFlag(result.countryCode);
    const countryPart = result.country ? (flag ? `${flag} ${result.country}` : result.country) : "";
    if (countryPart && result.city) {
      return `${countryPart}, ${result.city}`;
    }
    if (countryPart) {
      return countryPart;
    }
    return result.city || "";
  };

  const renderProviderAccessories = (result: ProviderResult) => {
    if (!result.ok) {
      return [];
    }
    const accessories: List.Item.Accessory[] = [];
    if (result.isp) {
      accessories.push({ text: result.isp });
    }
    if (result.asn) {
      accessories.push({ tag: result.asn });
    }
    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Compare geolocation of IP"
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <IpEmptyView
        title={
          isLoading
            ? "Loading..."
            : error instanceof PublicIpError
              ? "Could not find your public IP"
              : "Enter a valid IPv4 or IPv6 address"
        }
      />
      {data && summary && (
        <>
          <List.Section title="Summary">
            <List.Item
              icon={summaryIcon}
              title={summaryTitle}
              subtitle={summarySubtitle}
              accessories={[{ text: targetIp }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Summary" content={formatOverallSummary(targetIp, summary)} />
                  <Action.CopyToClipboard title="Copy IP Address" content={targetIp} />
                  <ActionPanel.Section>
                    <ActionOpenCommandPreferences />
                    <ActionOpenExtensionPreferences />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Providers">
            {results.map((result) => (
              <List.Item
                key={result.provider}
                icon={result.ok ? undefined : Icon.XMarkCircle}
                title={result.provider}
                subtitle={renderProviderSubtitle(result)}
                accessories={renderProviderAccessories(result)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Summary" content={formatProviderSummary(result)} />
                    <Action.OpenInBrowser url={result.url} />
                    <Action.CopyToClipboard title="Copy IP Address" content={targetIp} />
                    <ActionPanel.Section>
                      <ActionOpenCommandPreferences />
                      <ActionOpenExtensionPreferences />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
