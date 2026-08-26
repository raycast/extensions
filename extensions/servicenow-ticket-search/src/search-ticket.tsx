import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { buildTicketUrl, filterTicketTypes, padTicketNumber, parseTicketInput } from "./servicenow";

interface Preferences {
  snowInstance: string;
}

/**
 * Presentation only. Kept beside the component rather than in the domain module
 * so that module stays free of @raycast/api and remains testable in plain Node.
 */
const appearance: Record<string, { icon: Icon; color: Color }> = {
  incident: { icon: Icon.ExclamationMark, color: Color.Red },
  change: { icon: Icon.TwoArrowsClockwise, color: Color.Blue },
  demand: { icon: Icon.LightBulb, color: Color.Orange },
  enhancement: { icon: Icon.StarCircle, color: Color.Green },
  request_item: { icon: Icon.Document, color: Color.Purple },
};

export default function SearchTicket() {
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  const parsed = parseTicketInput(searchText);
  const filteredTickets = filterTicketTypes(searchText, parsed);
  const ticketNumber = parsed?.number ?? "";

  return (
    <List
      searchBarPlaceholder="Enter ticket number (e.g., INC0012345, CHG0012345, 12345)"
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {filteredTickets.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Ticket Type"
          description="Enter a ticket number with prefix (INC, CHG, DMND, ENHC, RITM) or just the number"
        />
      )}

      {filteredTickets.map((ticketType) => {
        const fullTicketNumber = ticketNumber
          ? `${ticketType.prefix}${padTicketNumber(ticketNumber)}`
          : ticketType.prefix;
        const url = buildTicketUrl(preferences.snowInstance, ticketType.table, fullTicketNumber);
        const { icon, color } = appearance[ticketType.id];

        return (
          <List.Item
            key={ticketType.id}
            icon={{ source: icon, tintColor: color }}
            title={fullTicketNumber}
            subtitle={ticketType.name}
            accessories={[{ text: parsed ? "Press Enter to Open" : "Enter ticket number" }]}
            actions={
              parsed ? (
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Ticket in Browser"
                    icon={Icon.Globe}
                    url={url}
                  />
                  <Action.CopyToClipboard
                    title="Copy Ticket Number"
                    content={fullTicketNumber}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Ticket URL"
                    content={url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        );
      })}
    </List>
  );
}
