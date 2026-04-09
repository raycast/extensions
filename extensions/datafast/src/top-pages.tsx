import { useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchPages, fetchMetadata } from "./lib/api";
import { useDateRange } from "./lib/date-ranges";
import { formatNumber, formatCurrency } from "./lib/format";

export default function TopPages() {
  const { range, dropdown } = useDateRange("30d");
  const params = useMemo(() => ({ ...range, limit: 100 }), [range]);

  const { data, isLoading } = useCachedPromise(fetchPages, [params], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load pages" },
  });
  const { data: metadata } = useCachedPromise(fetchMetadata, []);

  const currency = metadata?.currency || "USD";
  const pages = data || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages..."
      searchBarAccessory={dropdown}
    >
      <List.Section title={`${pages.length} Pages`}>
        {pages.map((page, i) => (
          <List.Item
            key={`${page.hostname}-${page.path}-${i}`}
            title={page.path}
            subtitle={page.hostname}
            icon={Icon.Document}
            keywords={[page.hostname, page.path]}
            accessories={[
              {
                text: `${formatNumber(page.visitors)} visitors`,
                icon: Icon.Person,
                tooltip: "Total unique visitors",
              },
              ...(page.revenue > 0
                ? [
                    {
                      text: formatCurrency(page.revenue, currency),
                      icon: Icon.BankNote,
                      tooltip: "Total revenue",
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Page"
                  icon={Icon.Globe}
                  url={`https://${page.hostname}${page.path}`}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  content={`https://${page.hostname}${page.path}`}
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
        ))}
      </List.Section>
      {pages.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Pages Found"
          description="Try a different date range"
          icon={Icon.Document}
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
