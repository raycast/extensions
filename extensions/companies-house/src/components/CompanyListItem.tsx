import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

import {
  companyStatusLabel,
  companyTypeLabel,
  companyWebUrl,
  formatDate,
  statusColor,
} from "../helpers";
import type { CompanySearchItem } from "../types";

import { CompanyProfile } from "./CompanyProfile";

export function CompanyListItem({
  item,
  showingDetail,
  onToggleDetail,
}: {
  item: CompanySearchItem;
  showingDetail: boolean;
  onToggleDetail: () => void;
}) {
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
      subtitle={showingDetail ? undefined : item.company_number}
      accessories={showingDetail ? undefined : accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Company Number"
                text={item.company_number}
              />
              {item.company_status ? (
                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={
                      companyStatusLabel(item.company_status) ??
                      item.company_status
                    }
                    color={statusColor(item.company_status)}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {item.company_type ? (
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={companyTypeLabel(item.company_type)}
                />
              ) : null}
              {item.date_of_creation ? (
                <List.Item.Detail.Metadata.Label
                  title="Incorporated"
                  text={formatDate(item.date_of_creation)}
                />
              ) : null}
              {item.date_of_cessation ? (
                <List.Item.Detail.Metadata.Label
                  title="Dissolved"
                  text={formatDate(item.date_of_cessation)}
                />
              ) : null}
              {item.address_snippet ? (
                <List.Item.Detail.Metadata.Label
                  title="Registered Office"
                  text={item.address_snippet}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
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
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "d" },
              Windows: { modifiers: ["ctrl", "shift"], key: "d" },
            }}
            onAction={onToggleDetail}
          />
          <Action.CopyToClipboard
            title="Copy Company Number"
            content={item.company_number}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
