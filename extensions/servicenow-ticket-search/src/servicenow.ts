/**
 * ServiceNow domain logic, deliberately free of any @raycast/api import so it
 * loads in a plain Node process and can be tested without stubbing the host.
 * Anything that needs Raycast types (icons, colours, components) lives in the
 * command module instead.
 */

export interface TicketType {
  id: string;
  name: string;
  prefix: string;
  table: string;
}

export const ticketTypes: TicketType[] = [
  { id: "incident", name: "Incident", prefix: "INC", table: "incident" },
  { id: "change", name: "Change Request", prefix: "CHG", table: "change_request" },
  { id: "demand", name: "Demand", prefix: "DMND", table: "dmn_demand" },
  { id: "enhancement", name: "Enhancement", prefix: "ENHC", table: "rm_enhancement" },
  { id: "request_item", name: "Request Item", prefix: "RITM", table: "sc_req_item" },
];

// ServiceNow stores record numbers zero-padded to a fixed width (7 digits on a
// default instance, e.g. INC0012345). A raw "12345" builds a number that matches
// no record, so pad anything shorter before it reaches a URL. If your instance
// is configured with a different width, change this constant.
export const TICKET_NUMBER_LENGTH = 7;

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
