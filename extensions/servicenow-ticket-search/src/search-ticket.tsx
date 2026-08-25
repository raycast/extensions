import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

interface Preferences {
  snowInstance: string;
}

interface TicketType {
  id: string;
  name: string;
  prefix: string;
  table: string;
  icon: Icon;
  color: Color;
}

const ticketTypes: TicketType[] = [
  {
    id: "incident",
    name: "Incident",
    prefix: "INC",
    table: "incident",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  {
    id: "change",
    name: "Change Request",
    prefix: "CHG",
    table: "change_request",
    icon: Icon.TwoArrowsClockwise,
    color: Color.Blue,
  },
  {
    id: "demand",
    name: "Demand",
    prefix: "DMND",
    table: "dmn_demand",
    icon: Icon.LightBulb,
    color: Color.Orange,
  },
  {
    id: "enhancement",
    name: "Enhancement",
    prefix: "ENHC",
    table: "rm_enhancement",
    icon: Icon.StarCircle,
    color: Color.Green,
  },
  {
    id: "request_item",
    name: "Request Item",
    prefix: "RITM",
    table: "sc_req_item",
    icon: Icon.Document,
    color: Color.Purple,
  },
];

// ServiceNow stores record numbers zero-padded to a fixed width (7 digits on a
// default instance, e.g. INC0012345). A raw "12345" builds a number that matches
// no record, so pad anything shorter before it reaches a URL. If your instance
// is configured with a different width, change this constant.
const TICKET_NUMBER_LENGTH = 7;

export const padTicketNumber = (ticketNumber: string): string =>
  ticketNumber.padStart(TICKET_NUMBER_LENGTH, "0");

/**
 * Reduces whatever the user typed into the preferences field to a bare host.
 * Tolerates a pasted full URL ("https://acme.service-now.com/nav_to.do"),
 * stray whitespace, and a trailing slash.
 */
export const normalizeInstanceUrl = (url: string): string =>
  url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");

/**
 * Builds a table-scoped deep link. The nav target is percent-encoded: it
 * carries its own "?" and "=", which must not be read as separators belonging
 * to nav_to.do's own query string.
 */
export const buildTicketUrl = (
  instance: string,
  table: string,
  fullTicketNumber: string
): string => {
  const host = normalizeInstanceUrl(instance);
  const target = `${table}.do?sysparm_query=number=${fullTicketNumber}`;
  return `https://${host}/nav_to.do?uri=${encodeURIComponent(target)}`;
};

export interface ParsedTicket {
  prefix: string;
  number: string;
}

/**
 * Splits user input into a prefix and a numeric part. An empty prefix means the
 * input was digits only and could belong to any table. Returns null when the
 * input is not a ticket reference at all, in which case it is treated as a
 * free-text filter over the ticket type list.
 */
export const parseTicketInput = (input: string): ParsedTicket | null => {
  const cleaned = input.replace(/\s/g, "").toUpperCase();

  for (const ticketType of ticketTypes) {
    const prefix = ticketType.prefix;
    if (cleaned.startsWith(prefix)) {
      const number = cleaned.slice(prefix.length);
      if (number && /^\d+$/.test(number)) {
        return { prefix, number };
      }
    }
  }

  if (/^\d+$/.test(cleaned)) {
    return { prefix: "", number: cleaned };
  }

  return null;
};

export const filterTicketTypes = (
  searchText: string,
  parsed: ParsedTicket | null
): TicketType[] => {
  if (!searchText) {
    return ticketTypes;
  }

  if (parsed) {
    // A recognised prefix narrows to one table; digits alone could be any of them.
    return parsed.prefix ? ticketTypes.filter((t) => t.prefix === parsed.prefix) : ticketTypes;
  }

  const query = searchText.toLowerCase();
  return ticketTypes.filter(
    (t) => t.prefix.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)
  );
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

        return (
          <List.Item
            key={ticketType.id}
            icon={{ source: ticketType.icon, tintColor: ticketType.color }}
            title={fullTicketNumber}
            subtitle={ticketType.name}
            accessories={[{ text: parsed ? "Press Enter to Open" : "Enter ticket number" }]}
            actions={
              parsed ? (
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Ticket in Browser"
                    icon={Icon.Globe}
                    url={buildTicketUrl(
                      preferences.snowInstance,
                      ticketType.table,
                      fullTicketNumber
                    )}
                  />
                  <Action.CopyToClipboard
                    title="Copy Ticket Number"
                    content={fullTicketNumber}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Ticket URL"
                    content={buildTicketUrl(
                      preferences.snowInstance,
                      ticketType.table,
                      fullTicketNumber
                    )}
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
