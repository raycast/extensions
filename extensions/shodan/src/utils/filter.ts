import { ShodanSearchMatch } from "../api/types";

interface ParsedFilter {
  field: string;
  value: string;
  isNegated: boolean;
}

// Parse a search query into filters and free text
export function parseFilterQuery(query: string): {
  filters: ParsedFilter[];
  freeText: string;
} {
  const filters: ParsedFilter[] = [];
  let freeText = query;

  // Match patterns like "country:it", "-port:22", "org:google"
  const filterRegex = /(-?)(\w+):([^\s]+)/g;
  let match;

  while ((match = filterRegex.exec(query)) !== null) {
    filters.push({
      isNegated: match[1] === "-",
      field: match[2].toLowerCase(),
      value: match[3].toLowerCase(),
    });
    // Remove the matched filter from free text
    freeText = freeText.replace(match[0], "").trim();
  }

  return { filters, freeText: freeText.toLowerCase() };
}

// Get a field value from a result for filtering
function getFieldValue(
  result: ShodanSearchMatch,
  field: string,
): string | string[] | number | null {
  switch (field) {
    case "country":
    case "country_code":
      return result.location.country_code?.toLowerCase() || null;
    case "country_name":
      return result.location.country_name?.toLowerCase() || null;
    case "city":
      return result.location.city?.toLowerCase() || null;
    case "port":
      return result.port;
    case "org":
    case "organization":
      return result.org?.toLowerCase() || null;
    case "asn":
      return result.asn?.toLowerCase() || null;
    case "isp":
      return result.isp?.toLowerCase() || null;
    case "os":
      return result.os?.toLowerCase() || null;
    case "product":
      return result.product?.toLowerCase() || null;
    case "version":
      return result.version?.toLowerCase() || null;
    case "hostname":
    case "hostnames":
      return result.hostnames?.map((h) => h.toLowerCase()) || [];
    case "ip":
      return result.ip_str;
    case "vuln":
    case "cve":
      return result.vulns
        ? Object.keys(result.vulns).map((v) => v.toLowerCase())
        : [];
    case "tag":
    case "tags":
      return result.tags?.map((t) => t.toLowerCase()) || [];
    default:
      return null;
  }
}

// Check if a single filter matches a result
function matchesFilter(
  result: ShodanSearchMatch,
  filter: ParsedFilter,
): boolean {
  const fieldValue = getFieldValue(result, filter.field);

  if (fieldValue === null) {
    return filter.isNegated; // If field doesn't exist, negated filter passes
  }

  let matches = false;

  if (Array.isArray(fieldValue)) {
    // For array fields (hostnames, vulns, tags)
    matches = fieldValue.some((v) => v.includes(filter.value));
  } else if (typeof fieldValue === "number") {
    // For numeric fields (port)
    matches = String(fieldValue) === filter.value;
  } else {
    // For string fields
    matches = fieldValue.includes(filter.value);
  }

  return filter.isNegated ? !matches : matches;
}

// Check if free text matches any searchable field
function matchesFreeText(result: ShodanSearchMatch, text: string): boolean {
  if (!text) return true;

  const searchableFields = [
    result.ip_str,
    result.org,
    result.asn,
    result.isp,
    result.product,
    result.version,
    result.os,
    result.location.country_code,
    result.location.country_name,
    result.location.city,
    ...(result.hostnames || []),
    ...(result.tags || []),
    ...(result.vulns ? Object.keys(result.vulns) : []),
    String(result.port),
  ]
    .filter(Boolean)
    .map((f) => String(f).toLowerCase());

  return searchableFields.some((field) => field.includes(text));
}

// Main filter function - filters an array of results based on a query string
export function filterResults(
  results: ShodanSearchMatch[],
  query: string,
): ShodanSearchMatch[] {
  if (!query.trim()) {
    return results;
  }

  const { filters, freeText } = parseFilterQuery(query);

  return results.filter((result) => {
    // Check all filters
    const allFiltersMatch = filters.every((filter) =>
      matchesFilter(result, filter),
    );
    if (!allFiltersMatch) return false;

    // Check free text
    return matchesFreeText(result, freeText);
  });
}

// Get filter suggestions based on current results
export function getFilterSuggestions(results: ShodanSearchMatch[]): string[] {
  const suggestions = new Set<string>();

  // Collect unique values for common filter fields
  const countries = new Set<string>();
  const ports = new Set<number>();
  const orgs = new Set<string>();
  const products = new Set<string>();

  results.forEach((r) => {
    if (r.location.country_code)
      countries.add(r.location.country_code.toLowerCase());
    ports.add(r.port);
    if (r.org) orgs.add(r.org);
    if (r.product) products.add(r.product);
  });

  // Add suggestions with counts
  countries.forEach((c) => suggestions.add(`country:${c}`));
  ports.forEach((p) => suggestions.add(`port:${p}`));

  return Array.from(suggestions).slice(0, 20);
}
