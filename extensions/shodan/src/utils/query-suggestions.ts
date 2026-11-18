import {
  SHODAN_FILTERS,
  COMMON_PORTS,
  COMMON_PRODUCTS,
  COMMON_CVES,
  COUNTRY_CODES,
} from "../data/shodan-filters";

export interface QuerySuggestion {
  title: string;
  subtitle: string;
  value: string;
  type: "filter" | "value";
}

/**
 * Parse the current query and generate autocomplete suggestions
 */
export function getQuerySuggestions(query: string): QuerySuggestion[] {
  if (!query || query.trim().length === 0) {
    // Show most common filters when query is empty
    return [
      {
        title: "country:",
        subtitle: "Filter by country code (e.g., country:US)",
        value: "country:",
        type: "filter",
      },
      {
        title: "port:",
        subtitle: "Filter by port number (e.g., port:80)",
        value: "port:",
        type: "filter",
      },
      {
        title: "product:",
        subtitle: "Filter by software/product (e.g., product:Apache)",
        value: "product:",
        type: "filter",
      },
      {
        title: "vuln:",
        subtitle: "Filter by CVE ID (e.g., vuln:CVE-2021-44228)",
        value: "vuln:",
        type: "filter",
      },
      {
        title: "org:",
        subtitle: "Filter by organization (e.g., org:Google)",
        value: "org:",
        type: "filter",
      },
    ];
  }

  // Get the last token (word being typed)
  const tokens = query.split(/\s+/);
  const lastToken = tokens[tokens.length - 1];

  // Check if typing a filter (contains ':')
  const colonIndex = lastToken.indexOf(":");

  if (colonIndex === -1) {
    // Typing filter name - suggest matching filters
    return getFilterNameSuggestions(lastToken, query);
  } else {
    // Typing filter value - suggest values
    const filterName = lastToken.substring(0, colonIndex);
    const filterValue = lastToken.substring(colonIndex + 1);
    return getFilterValueSuggestions(filterName, filterValue, query);
  }
}

/**
 * Get suggestions for filter names
 */
function getFilterNameSuggestions(
  partial: string,
  fullQuery: string,
): QuerySuggestion[] {
  const lowerPartial = partial.toLowerCase();

  return SHODAN_FILTERS.filter((filter) =>
    filter.name.toLowerCase().startsWith(lowerPartial),
  )
    .slice(0, 8)
    .map((filter) => ({
      title: `${filter.name}:`,
      subtitle: filter.description,
      value: fullQuery.replace(new RegExp(`${partial}$`), `${filter.name}:`),
      type: "filter" as const,
    }));
}

/**
 * Get suggestions for filter values based on filter type
 */
function getFilterValueSuggestions(
  filterName: string,
  partial: string,
  fullQuery: string,
): QuerySuggestion[] {
  const filter = SHODAN_FILTERS.find((f) => f.name === filterName);

  if (!filter) {
    return [];
  }

  const lowerPartial = partial.toLowerCase();
  let suggestions: string[] = [];

  // Generate suggestions based on filter type and suggestions
  switch (filter.name) {
    case "port":
      // Show common ports
      suggestions = Object.keys(COMMON_PORTS).filter((port) =>
        port.startsWith(partial),
      );
      return suggestions.slice(0, 10).map((port) => ({
        title: port,
        subtitle: `${COMMON_PORTS[port]} - ${filter.description}`,
        value: fullQuery.replace(
          new RegExp(`${filterName}:${partial}$`),
          `${filterName}:${port}`,
        ),
        type: "value" as const,
      }));

    case "product":
      // Show common products
      suggestions = COMMON_PRODUCTS.filter((p) =>
        p.toLowerCase().includes(lowerPartial),
      );
      return suggestions.slice(0, 10).map((product) => {
        // Add quotes if product contains spaces
        const quotedProduct = product.includes(" ") ? `"${product}"` : product;
        return {
          title: product,
          subtitle: `Search for ${product} software`,
          value: fullQuery.replace(
            new RegExp(`${filterName}:${partial}$`),
            `${filterName}:${quotedProduct}`,
          ),
          type: "value" as const,
        };
      });

    case "country": {
      // Show country codes
      const matchingCountries = Object.entries(COUNTRY_CODES)
        .filter(
          ([code, name]) =>
            code.toLowerCase().startsWith(lowerPartial) ||
            name.toLowerCase().includes(lowerPartial),
        )
        .slice(0, 10);

      return matchingCountries.map(([code, name]) => ({
        title: code,
        subtitle: name,
        value: fullQuery.replace(
          new RegExp(`${filterName}:${partial}$`),
          `${filterName}:${code}`,
        ),
        type: "value" as const,
      }));
    }

    case "vuln":
      // Show common CVEs
      suggestions = COMMON_CVES.filter((cve) =>
        cve.toLowerCase().includes(lowerPartial),
      );
      return suggestions.slice(0, 10).map((cve) => ({
        title: cve,
        subtitle: `Search for ${cve} vulnerability`,
        value: fullQuery.replace(
          new RegExp(`${filterName}:${partial}$`),
          `${filterName}:${cve}`,
        ),
        type: "value" as const,
      }));

    case "has_screenshot":
    case "has_ipv6":
      // Boolean values
      return ["true", "false"]
        .filter((v) => v.startsWith(lowerPartial))
        .map((bool) => ({
          title: bool,
          subtitle: filter.description,
          value: fullQuery.replace(
            new RegExp(`${filterName}:${partial}$`),
            `${filterName}:${bool}`,
          ),
          type: "value" as const,
        }));

    default:
      // Use predefined suggestions if available
      if (filter.suggestions) {
        suggestions = filter.suggestions.filter((s) =>
          s.toLowerCase().includes(lowerPartial),
        );
        return suggestions.slice(0, 10).map((suggestion) => {
          // Add quotes if suggestion contains spaces
          const quotedSuggestion = suggestion.includes(" ")
            ? `"${suggestion}"`
            : suggestion;
          return {
            title: suggestion,
            subtitle: filter.description,
            value: fullQuery.replace(
              new RegExp(`${filterName}:${partial}$`),
              `${filterName}:${quotedSuggestion}`,
            ),
            type: "value" as const,
          };
        });
      }
  }

  // No suggestions available - show the filter example
  return [
    {
      title: filter.example.split(":")[1] || "value",
      subtitle: `Example: ${filter.example}`,
      value: fullQuery,
      type: "value" as const,
    },
  ];
}

/**
 * Quick filter templates for common searches
 */
export const QUICK_FILTERS = [
  {
    title: "Apache servers",
    query: "product:Apache",
    subtitle: "Find Apache web servers",
  },
  {
    title: "SSH servers",
    query: "port:22",
    subtitle: "Find SSH services",
  },
  {
    title: "Vulnerable to Heartbleed",
    query: "vuln:CVE-2014-0160",
    subtitle: "Find devices vulnerable to Heartbleed",
  },
  {
    title: "Industrial Control Systems",
    query: "tag:ics",
    subtitle: "Find SCADA/ICS devices",
  },
  {
    title: "Webcams",
    query: "has_screenshot:true product:webcam",
    subtitle: "Find internet-connected cameras",
  },
  {
    title: "MongoDB databases",
    query: "product:MongoDB",
    subtitle: "Find MongoDB instances",
  },
  {
    title: "RDP servers",
    query: "port:3389",
    subtitle: "Find Remote Desktop Protocol servers",
  },
  {
    title: "Elasticsearch clusters",
    query: "product:Elasticsearch",
    subtitle: "Find Elasticsearch instances",
  },
];
