import { Action, ActionPanel, confirmAlert, Icon, List } from "@raycast/api";
import { Check, Site } from "../interface";
import { checkStatuses, icons, ohdearUrl } from "../utils/constants";
import {
  ActionAddSite,
  ActionBrokenLinks,
  ActionCertificateHealth,
  ActionDNSRecords,
  ActionDowntime,
  ActionMixedContent,
  ActionOpenPreferences,
  ActionPerformanceRecords,
  ActionUptime,
} from "./actions";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(relativeTime);
dayjs.extend(utc);

export function SiteItem({ entry, onRemoveItem }: { entry: any; onRemoveItem: (item: Site) => Promise<void> }) {
  const result = entry.summarized_check_result as "succeeded" | "warning" | "failed";
  const lastCheck = dayjs.utc(entry.latest_run_date).local().fromNow();

  return (
    <List.Item
      icon={icons[result]}
      key={entry.id}
      title={entry.label}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Last checked" text={lastCheck} />
              <List.Item.Detail.Metadata.Separator />
              {entry.checks.map((check: Check) => {
                if (!check.enabled) {
                  return;
                }

                const checkStatus = check.latest_run_result as
                  | "succeeded"
                  | "pending"
                  | "failed"
                  | "warning"
                  | "errored-or-timed-out";

                return (
                  <List.Item.Detail.Metadata.Label
                    key={check.id}
                    title={check.label}
                    text={`${check.summary} ${checkStatuses[checkStatus]}`}
                  />
                );
              })}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<Actions item={entry} onItemRemove={onRemoveItem} />}
    />
  );
}

function Actions({ item, onItemRemove }: { item: Site; onItemRemove: (item: Site) => Promise<void> }) {
  const addedChecks = [] as string[];
  item.checks.forEach((item) => {
    if (item.enabled) {
      addedChecks.push(item.type);
    }
  });

  return (
    <>
      <ActionPanel>
        <Action.OpenInBrowser
          title="Open in Oh Dear"
          url={`${ohdearUrl}/sites/${item.id}/active-checks`}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.OpenInBrowser title="Open in Browser" url={item.url} shortcut={{ modifiers: ["cmd"], key: "i" }} />
        <Action.CopyToClipboard
          title="Copy URL to Clipboard"
          content={item.url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <ActionPanel.Section title="Reports">
          {addedChecks.includes("uptime") && <ActionUptime item={item} />}
          {addedChecks.includes("uptime") && <ActionDowntime item={item} />}
          {addedChecks.includes("broken_links") && <ActionBrokenLinks item={item} />}
          {addedChecks.includes("certificate_health") && <ActionCertificateHealth item={item} />}
          {addedChecks.includes("mixed_content") && <ActionMixedContent item={item} />}
          {addedChecks.includes("performance") && <ActionPerformanceRecords item={item} />}
          {addedChecks.includes("dns") && <ActionDNSRecords item={item} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <ActionAddSite />
          <Action
            title="Remove Site"
            icon={Icon.Trash}
            onAction={async () => {
              if (await confirmAlert({ title: `Are you sure you you want to delete ${item.label}?` })) {
                await onItemRemove(item);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <ActionOpenPreferences />
        </ActionPanel.Section>
      </ActionPanel>
    </>
  );
}
