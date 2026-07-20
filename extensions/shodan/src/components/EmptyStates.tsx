import { List, Icon } from "@raycast/api";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: Icon;
}

export function EmptyState({
  title,
  description,
  icon = Icon.MagnifyingGlass,
}: EmptyStateProps) {
  return <List.EmptyView icon={icon} title={title} description={description} />;
}

// Predefined empty states for common scenarios
export const EmptyStates = {
  NoSearchResults: (query?: string) => (
    <EmptyState
      icon={Icon.MagnifyingGlass}
      title="No Results Found"
      description={
        query
          ? `No results found for "${query}"`
          : "Try a different search query"
      }
    />
  ),

  NoFavorites: () => (
    <EmptyState
      icon={Icon.Star}
      title="No Favorite Queries"
      description="Save your frequently used queries for quick access"
    />
  ),

  NoAlerts: () => (
    <EmptyState
      icon={Icon.Bell}
      title="No Network Alerts"
      description="Create alerts to monitor your IP addresses for changes"
    />
  ),

  NoExploits: (query?: string) => (
    <EmptyState
      icon={Icon.Bug}
      title="No Exploits Found"
      description={
        query
          ? `No exploits found for "${query}"`
          : "Try a different search term"
      }
    />
  ),

  NoHostInfo: (ip?: string) => (
    <EmptyState
      icon={Icon.XMarkCircle}
      title="No Information Available"
      description={
        ip
          ? `No information available for ${ip}. The host may not be indexed in Shodan.`
          : "Enter an IP address to lookup host information"
      }
    />
  ),

  NoSubdomains: (hasFilter: boolean) => (
    <EmptyState
      icon={Icon.XMarkCircle}
      title="No Subdomains Found"
      description={
        hasFilter
          ? "Try a different filter"
          : "No subdomains found in Shodan's database"
      }
    />
  ),

  SearchToStart: () => (
    <EmptyState
      icon={Icon.MagnifyingGlass}
      title="Start Searching"
      description="Enter a query to search Shodan's database"
    />
  ),

  Loading: () => (
    <EmptyState
      icon={Icon.ArrowClockwise}
      title="Loading..."
      description="Fetching data from Shodan"
    />
  ),

  Error: (message?: string) => (
    <EmptyState
      icon={Icon.ExclamationMark}
      title="Error"
      description={message || "An error occurred while fetching data"}
    />
  ),
};
