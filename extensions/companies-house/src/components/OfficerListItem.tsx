import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

import { extractOfficerId, formatDateOfBirth, officerWebUrl } from "../helpers";
import type { OfficerSearchItem } from "../types";

import { Disqualifications } from "./Disqualifications";
import { OfficerAppointments } from "./OfficerAppointments";

export function OfficerListItem({ item }: { item: OfficerSearchItem }) {
  const officerId = extractOfficerId(item.links?.self);
  const born = formatDateOfBirth(item.date_of_birth);

  const accessories: List.Item.Accessory[] = [];
  if (typeof item.appointment_count === "number") {
    accessories.push({
      icon: Icon.Building,
      text: String(item.appointment_count),
      tooltip: `${item.appointment_count} appointment${item.appointment_count === 1 ? "" : "s"}`,
    });
  }
  if (born) {
    accessories.push({ text: `Born ${born}` });
  }

  return (
    <List.Item
      title={item.title}
      subtitle={item.address_snippet}
      accessories={accessories}
      actions={
        <ActionPanel>
          {officerId ? (
            <Action.Push
              title="View Appointments"
              icon={Icon.Building}
              target={
                <OfficerAppointments
                  officerId={officerId}
                  officerName={item.title}
                />
              }
            />
          ) : null}
          {officerId ? (
            <Action.OpenInBrowser
              title="Open on Companies House"
              url={officerWebUrl(officerId)}
            />
          ) : null}
          <Action.Push
            title="Search Disqualified Directors Register"
            icon={Icon.ExclamationMark}
            target={<Disqualifications officerName={item.title} />}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={item.title}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}
