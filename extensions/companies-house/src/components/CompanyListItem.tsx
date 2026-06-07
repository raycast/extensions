import { Action, ActionPanel, Icon, List } from "@raycast/api";

import {
  companyStatusLabel,
  companyWebUrl,
  formatDate,
  statusColor,
} from "../helpers";
import type { CompanySearchItem } from "../types";

import { CompanyProfile } from "./CompanyProfile";

export function CompanyListItem({ item }: { item: CompanySearchItem }) {
  const accessories: List.Item.Accessory[] = [];
  if (item.date_of_creation) {
    accessories.push({
      text: formatDate(item.date_of_creation),
      tooltip: "Incorporated",
    });
  }
  if (item.company_status) {
    accessories.push({
      tag: {
        value: companyStatusLabel(item.company_status) ?? item.company_status,
        color: statusColor(item.company_status),
      },
    });
  }

  return (
    <List.Item
      title={item.title}
      subtitle={item.company_number}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Company"
            icon={Icon.Building}
            target={
              <CompanyProfile
                companyNumber={item.company_number}
                name={item.title}
                initial={item}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={companyWebUrl(item.company_number)}
          />
          <Action.CopyToClipboard
            title="Copy Company Number"
            content={item.company_number}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
