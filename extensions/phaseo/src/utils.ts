import type { Model, Organisation, Provider } from "./types";

// Base URL for Phaseo website
const PHASEO_BASE_URL = "https://phaseo.app";

// Date formatting
export function formatDate(dateString: string | null): string {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMoneyFromNanos(nanos: number | null | undefined): string {
  const value = Number(nanos ?? 0);
  if (!Number.isFinite(value)) return "$0.00";
  return `$${(value / 1_000_000_000).toFixed(2)}`;
}

export function formatMoneyFromCents(cents: number | null | undefined): string {
  const value = Number(cents ?? 0);
  if (!Number.isFinite(value)) return "$0.00";
  return `$${(value / 100).toFixed(2)}`;
}

export function formatPricePerMillion(
  price: string | null | undefined,
): string | null {
  if (price == null) return null;
  const value = Number(price);
  if (!Number.isFinite(value)) return null;
  return `$${(value * 1_000_000).toFixed(2)}/M`;
}

export function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return "Unknown";
  }
}

// URL builders
export function getModelURL(modelId: string): string {
  return `${PHASEO_BASE_URL}/models/${modelId}`;
}

export function getOrganisationURL(organisationId: string): string {
  return `${PHASEO_BASE_URL}/organisations/${organisationId}`;
}

export function getProviderURL(providerId: string): string {
  return `${PHASEO_BASE_URL}/api-providers/${providerId}`;
}

// Country code to flag emoji
export function countryCodeToFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

// Status badge helpers
export function getStatusColor(status: string | null): string {
  if (!status) return "#gray";

  switch (status.toLowerCase()) {
    case "available":
    case "active":
      return "#green";
    case "deprecated":
    case "inactive":
      return "#orange";
    case "removed":
    case "unavailable":
      return "#red";
    case "preview":
    case "beta":
      return "#blue";
    default:
      return "#gray";
  }
}

export function getStatusText(status: string | null): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Data transformations
export function capitalizeFirst(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Model helpers
export function getModelDisplayName(model: Model): string {
  return model.name || model.model_id;
}

export function getModelOrganisationName(model: Model): string {
  return model.organisation_name || model.organisation_id || "Unknown";
}

export function getModelEndpointsText(model: Model): string {
  if (!model.endpoints || model.endpoints.length === 0) return "No endpoints";
  if (model.endpoints.length === 1) return model.endpoints[0];
  return `${model.endpoints.length} endpoints`;
}

// Organisation helpers
export function getOrganisationDisplayName(org: Organisation): string {
  return org.name || org.organisation_id;
}

// Provider helpers
export function getProviderDisplayName(provider: Provider): string {
  return provider.api_provider_name || provider.api_provider_id;
}

// Search/filter helpers
export function matchesSearch(
  text: string | null,
  searchText: string,
): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(searchText.toLowerCase());
}

export function modelMatchesSearch(model: Model, searchText: string): boolean {
  if (!searchText) return true;

  const searchLower = searchText.toLowerCase();

  // Search in model name, ID, organisation
  if (model.name?.toLowerCase().includes(searchLower)) return true;
  if (model.model_id.toLowerCase().includes(searchLower)) return true;
  if (model.organisation_name?.toLowerCase().includes(searchLower)) return true;
  if (model.organisation_id?.toLowerCase().includes(searchLower)) return true;

  // Search in aliases
  if (model.aliases?.some((alias) => alias.toLowerCase().includes(searchLower)))
    return true;

  // Search in endpoints
  if (
    model.endpoints?.some((endpoint) =>
      endpoint.toLowerCase().includes(searchLower),
    )
  )
    return true;

  return false;
}

export function organisationMatchesSearch(
  org: Organisation,
  searchText: string,
): boolean {
  if (!searchText) return true;

  const searchLower = searchText.toLowerCase();

  if (org.name?.toLowerCase().includes(searchLower)) return true;
  if (org.organisation_id.toLowerCase().includes(searchLower)) return true;
  if (org.description?.toLowerCase().includes(searchLower)) return true;

  return false;
}

export function providerMatchesSearch(
  provider: Provider,
  searchText: string,
): boolean {
  if (!searchText) return true;

  const searchLower = searchText.toLowerCase();

  if (provider.api_provider_name?.toLowerCase().includes(searchLower))
    return true;
  if (provider.api_provider_id.toLowerCase().includes(searchLower)) return true;
  if (provider.description?.toLowerCase().includes(searchLower)) return true;

  return false;
}
