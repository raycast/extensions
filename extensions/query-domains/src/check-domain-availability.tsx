import { useState, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BulkCheckResponse } from "./types";
import { formatRegistrationDate } from "./utils";
import { DEFAULT_TLDS } from "./constants";
import { DomainDetail } from "./components/DomainDetail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { apiKey, tldList } = getPreferenceValues<Preferences>();

  // Parse TLD list from preferences
  const tlds = useMemo(() => {
    const list = tldList || DEFAULT_TLDS;
    return list
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }, [tldList]);

  // Extract keyword and detect if user input is a full domain
  const { keyword, userTld } = useMemo(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return { keyword: "", userTld: null };

    const parts = trimmed.split(".");

    // If there's more than one part, user might have entered a full domain
    if (parts.length > 1) {
      const possibleTld = parts.slice(1).join(".");
      return {
        keyword: parts[0],
        userTld: possibleTld,
      };
    }

    return { keyword: parts[0], userTld: null };
  }, [searchText]);

  // Track user's specified domain
  const userSpecifiedDomain = useMemo(() => {
    if (userTld) {
      return `${keyword}.${userTld}`;
    }
    return null;
  }, [keyword, userTld]);

  // Generate domain list from keyword and TLD list
  const domains = useMemo(() => {
    if (!keyword) return [];

    // Start with default TLD combinations
    const defaultDomains = tlds.map((tld) => `${keyword}.${tld}`);

    // If user entered a full domain with TLD not in default list, add it first
    if (userTld && !tlds.includes(userTld)) {
      const userDomain = `${keyword}.${userTld}`;
      return [userDomain, ...defaultDomains];
    }

    return defaultDomains;
  }, [keyword, userTld, tlds]);

  const domainsParam = domains.join(",");

  const { data, isLoading, error } = useFetch<BulkCheckResponse>(
    `https://api.query.domains/api/v1/check?domain=${encodeURIComponent(domainsParam)}&format=json`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      execute: domains.length > 0,
      keepPreviousData: true,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to check domains",
          message: error.message,
        });
      },
    },
  );

  const tldCount = tlds.length;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Enter your keyword - ${tldCount} TLDs will be checked`}
      searchText={searchText}
      throttle
      isShowingDetail={domains.length > 0 && !error}
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Error checking domains"
          description={error.message}
        />
      ) : (
        !isLoading &&
        domains.length === 0 && (
          <List.EmptyView
            icon={{ source: Icon.MagnifyingGlass }}
            title="Check Domain Availability"
            description={`Enter a keyword. We'll check ${tldCount} TLDs automatically.`}
          />
        )
      )}

      {/* User specified domain section - always show first if exists */}
      {userSpecifiedDomain && data?.data?.domains && (
        <List.Section title="Your Query">
          {data.data.domains
            .filter((d) => d.domain === userSpecifiedDomain)
            .map((domain) => (
              <List.Item
                key={domain.domain}
                id={domain.domain}
                icon={{
                  source: Icon.Dot,
                  tintColor: domain.status === "available" ? Color.Green : Color.SecondaryText,
                }}
                title={domain.domain}
                subtitle={
                  domain.status === "registered" && formatRegistrationDate(domain.registered) !== "N/A"
                    ? formatRegistrationDate(domain.registered)
                    : undefined
                }
                detail={<DomainDetail domain={domain.domain} status={domain.status} apiKey={apiKey} />}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Domain"
                      content={domain.domain}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser title="Visit Website" url={`https://${domain.domain}`} icon={Icon.Globe} />
                    <ActionPanel.Section>
                      <Action
                        title="Modify Default TLDs"
                        icon={Icon.Gear}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                        onAction={openExtensionPreferences}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}

      {/* Available domains section */}
      {data?.data?.domains &&
        data.data.domains.filter((d) => d.status === "available" && d.domain !== userSpecifiedDomain).length > 0 && (
          <List.Section title="Available">
            {data.data.domains
              .filter((d) => d.status === "available" && d.domain !== userSpecifiedDomain)
              .map((domain) => (
                <List.Item
                  key={domain.domain}
                  id={domain.domain}
                  icon={{ source: Icon.Dot, tintColor: Color.Green }}
                  title={domain.domain}
                  detail={<DomainDetail domain={domain.domain} status="available" apiKey={apiKey} />}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Domain"
                        content={domain.domain}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.OpenInBrowser title="Visit Website" url={`https://${domain.domain}`} icon={Icon.Globe} />
                      <ActionPanel.Section>
                        <Action
                          title="Modify Default TLDs"
                          icon={Icon.Gear}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                          onAction={openExtensionPreferences}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        )}

      {/* Registered/Unavailable domains section */}
      {data?.data?.domains &&
        data.data.domains.filter((d) => d.status === "registered" && d.domain !== userSpecifiedDomain).length > 0 && (
          <List.Section title="Registered">
            {data.data.domains
              .filter((d) => d.status === "registered" && d.domain !== userSpecifiedDomain)
              .map((domain) => {
                const registrationDate = formatRegistrationDate(domain.registered);

                return (
                  <List.Item
                    key={domain.domain}
                    id={domain.domain}
                    icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
                    title={domain.domain}
                    subtitle={registrationDate !== "N/A" ? registrationDate : undefined}
                    detail={<DomainDetail domain={domain.domain} status="registered" apiKey={apiKey} />}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Domain"
                          content={domain.domain}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.OpenInBrowser
                          title="Visit Website"
                          url={`https://${domain.domain}`}
                          icon={Icon.Globe}
                        />
                        <ActionPanel.Section>
                          <Action
                            title="Modify Default TLDs"
                            icon={Icon.Gear}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                            onAction={openExtensionPreferences}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        )}
    </List>
  );
}
