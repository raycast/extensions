import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ApiInfo, ShodanProfile } from "./api/types";
import {
  formatCredits,
  getCreditColor,
  formatTimestamp,
} from "./utils/formatters";
import {
  usePlanCapabilities,
  getPlanUpgradeUrl,
} from "./hooks/usePlanCapabilities";

export default function AccountCommand() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { canAccessExploits, isPremium } = usePlanCapabilities();

  const {
    data: apiInfo,
    isLoading: apiLoading,
    revalidate: revalidateApi,
  } = useFetch<ApiInfo>(`https://api.shodan.io/api-info?key=${apiKey}`, {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load API Info",
        message: err.message,
      });
    },
  });

  const {
    data: profile,
    isLoading: profileLoading,
    revalidate: revalidateProfile,
  } = useFetch<ShodanProfile>(
    `https://api.shodan.io/account/profile?key=${apiKey}`,
    {
      onError: () => {
        // Profile endpoint may not be available for all plans, silently fail
      },
    },
  );

  const { data: myIp, isLoading: ipLoading } = useFetch<string>(
    `https://api.shodan.io/tools/myip?key=${apiKey}`,
    {
      onError: () => {
        // Silently fail
      },
    },
  );

  const isLoading = apiLoading || profileLoading || ipLoading;

  const revalidate = () => {
    revalidateApi();
    revalidateProfile();
  };

  const getPlanColor = (plan: string): Color => {
    const planColors: Record<string, Color> = {
      oss: Color.SecondaryText,
      dev: Color.Blue,
      basic: Color.Green,
      plus: Color.Orange,
      corp: Color.Purple,
      enterprise: Color.Red,
    };
    return planColors[plan.toLowerCase()] || Color.SecondaryText;
  };

  return (
    <List isLoading={isLoading} navigationTitle="Shodan Account">
      <List.Section title="API Credits">
        <List.Item
          title="Query Credits"
          subtitle={
            apiInfo ? formatCredits(apiInfo.query_credits) : "Loading..."
          }
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: apiInfo
              ? getCreditColor(apiInfo.query_credits)
              : Color.SecondaryText,
          }}
          accessories={
            apiInfo
              ? [
                  {
                    tag: {
                      value:
                        apiInfo.query_credits > 0 ? "Available" : "Exhausted",
                      color: getCreditColor(apiInfo.query_credits),
                    },
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.OpenInBrowser
                title="Manage Credits"
                url="https://account.shodan.io/"
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Scan Credits"
          subtitle={
            apiInfo ? formatCredits(apiInfo.scan_credits) : "Loading..."
          }
          icon={{
            source: Icon.Eye,
            tintColor: apiInfo
              ? getCreditColor(apiInfo.scan_credits)
              : Color.SecondaryText,
          }}
          accessories={
            apiInfo
              ? [
                  {
                    tag: {
                      value: apiInfo.scan_credits > 0 ? "Available" : "None",
                      color: getCreditColor(apiInfo.scan_credits),
                    },
                  },
                ]
              : []
          }
        />
        <List.Item
          title="Monitored IPs"
          subtitle={
            apiInfo
              ? `${apiInfo.monitored_ips.toLocaleString()} IPs`
              : "Loading..."
          }
          icon={Icon.Bell}
        />
      </List.Section>

      <List.Section title="Plan Details">
        <List.Item
          title="Current Plan"
          subtitle={apiInfo?.plan || "Loading..."}
          icon={{
            source: Icon.Star,
            tintColor: apiInfo
              ? getPlanColor(apiInfo.plan)
              : Color.SecondaryText,
          }}
          accessories={
            apiInfo
              ? [
                  {
                    tag: {
                      value: apiInfo.plan.toUpperCase(),
                      color: getPlanColor(apiInfo.plan),
                    },
                  },
                  !isPremium
                    ? {
                        tag: { value: "Free Tier", color: Color.SecondaryText },
                      }
                    : null,
                ].filter((a): a is NonNullable<typeof a> => a !== null)
              : []
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Upgrade Plan"
                url={getPlanUpgradeUrl()}
              />
            </ActionPanel>
          }
        />
        {apiInfo && (
          <>
            <List.Item
              title="HTTPS Filter"
              subtitle={apiInfo.https ? "Enabled" : "Requires Membership"}
              icon={{
                source: Icon.Lock,
                tintColor: apiInfo.https ? Color.Green : Color.Orange,
              }}
              accessories={[
                apiInfo.https
                  ? { tag: { value: "Available", color: Color.Green } }
                  : { tag: { value: "Upgrade Required", color: Color.Orange } },
              ]}
              actions={
                !apiInfo.https ? (
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Upgrade to Enable"
                      url={getPlanUpgradeUrl()}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
            <List.Item
              title="Telnet Filter"
              subtitle={apiInfo.telnet ? "Enabled" : "Requires Membership"}
              icon={{
                source: Icon.Terminal,
                tintColor: apiInfo.telnet ? Color.Green : Color.Orange,
              }}
              accessories={[
                apiInfo.telnet
                  ? { tag: { value: "Available", color: Color.Green } }
                  : { tag: { value: "Upgrade Required", color: Color.Orange } },
              ]}
              actions={
                !apiInfo.telnet ? (
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Upgrade to Enable"
                      url={getPlanUpgradeUrl()}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
            <List.Item
              title="Exploits API"
              subtitle={canAccessExploits ? "Enabled" : "Requires Membership"}
              icon={{
                source: Icon.Bug,
                tintColor: canAccessExploits ? Color.Green : Color.Orange,
              }}
              accessories={[
                canAccessExploits
                  ? { tag: { value: "Available", color: Color.Green } }
                  : { tag: { value: "Upgrade Required", color: Color.Orange } },
              ]}
              actions={
                !canAccessExploits ? (
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Upgrade to Enable"
                      url={getPlanUpgradeUrl()}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
            <List.Item
              title="Unlocked Results"
              subtitle={
                apiInfo.unlocked
                  ? `${apiInfo.unlocked_left} remaining`
                  : "Requires Membership"
              }
              icon={{
                source: Icon.LockUnlocked,
                tintColor: apiInfo.unlocked ? Color.Green : Color.Orange,
              }}
              accessories={[
                apiInfo.unlocked
                  ? { tag: { value: "Available", color: Color.Green } }
                  : { tag: { value: "Upgrade Required", color: Color.Orange } },
              ]}
              actions={
                !apiInfo.unlocked ? (
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Upgrade to Enable"
                      url={getPlanUpgradeUrl()}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
          </>
        )}
      </List.Section>

      {profile && (
        <List.Section title="Profile">
          <List.Item
            title="Display Name"
            subtitle={profile.display_name || "Not set"}
            icon={Icon.Person}
          />
          <List.Item
            title="Member Since"
            subtitle={formatTimestamp(profile.created)}
            icon={Icon.Calendar}
          />
          <List.Item
            title="Membership"
            subtitle={profile.member ? "Active Member" : "Free Account"}
            icon={{
              source: Icon.Checkmark,
              tintColor: profile.member ? Color.Green : Color.SecondaryText,
            }}
          />
        </List.Section>
      )}

      {myIp && (
        <List.Section title="Your Connection">
          <List.Item
            title="Your IP Address"
            subtitle={typeof myIp === "string" ? myIp : String(myIp)}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy IP"
                  content={typeof myIp === "string" ? myIp : String(myIp)}
                />
                <Action.OpenInBrowser
                  title="View on Shodan"
                  url={`https://www.shodan.io/host/${typeof myIp === "string" ? myIp : String(myIp)}`}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Quick Links">
        <List.Item
          title="Shodan Dashboard"
          subtitle="View your Shodan dashboard"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Dashboard"
                url="https://www.shodan.io/dashboard"
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Account Settings"
          subtitle="Manage your Shodan account"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Settings"
                url="https://account.shodan.io/"
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="API Documentation"
          subtitle="View Shodan API docs"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Docs"
                url="https://developer.shodan.io/api"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
