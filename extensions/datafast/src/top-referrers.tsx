import { useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { fetchReferrers, fetchMetadata } from "./lib/api";
import { useDateRange } from "./lib/date-ranges";
import { formatNumber, formatCurrency } from "./lib/format";

export default function TopReferrers() {
  const { range, dropdown } = useDateRange("30d");
  const params = useMemo(() => ({ ...range, limit: 100 }), [range]);

  const { data, isLoading } = useCachedPromise(fetchReferrers, [params], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to get Datafast data" },
  });
  const { data: metadata } = useCachedPromise(fetchMetadata, []);

  const currency = metadata?.currency || "USD";
  const referrers = data || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search referrers..."
      searchBarAccessory={dropdown}
    >
      <List.Section title={`${referrers.length} Referrers`}>
        {referrers.map((ref, i) => {
          const domain = ref.referrer || "Direct";

          return (
            <List.Item
              key={`${domain}-${i}`}
              title={domain}
              icon={
                ref.referrer
                  ? getFavicon(`https://${ref.referrer}`, {
                      fallback: Icon.Link,
                    })
                  : Icon.Link
              }
              keywords={[domain]}
              accessories={[
                {
                  text: `${formatNumber(ref.visitors)} visitors`,
                  icon: Icon.Person,
                  tooltip: "Total unique visitors",
                },
                ...(ref.revenue > 0
                  ? [
                      {
                        text: formatCurrency(ref.revenue, currency),
                        icon: Icon.BankNote,
                        tooltip: "Total revenue",
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  {ref.referrer && (
                    <Action.OpenInBrowser
                      title="Open Referrer"
                      icon={Icon.Globe}
                      url={`https://${ref.referrer}`}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Referrer"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={domain}
                  />
                  <Action.OpenInBrowser
                    title="Open Datafast Dashboard"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    url="https://datafa.st"
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {referrers.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Referrers Found"
          description="Try a different date range"
          icon={Icon.Link}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
