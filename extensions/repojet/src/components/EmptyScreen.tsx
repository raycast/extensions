import { List, Icon, Color } from "@raycast/api";

interface EmptyScreenProps {
  error?: Error;
  hasSearchText?: boolean;
}

export default function EmptyScreen({
  error,
  hasSearchText,
}: EmptyScreenProps) {
  if (error) {
    return (
      <List.EmptyView
        title="Failed to Load Repositories"
        description={`Something went wrong: ${error.message}\n\nPlease check your GitHub token and organization settings, or try again later.`}
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      />
    );
  }

  if (hasSearchText) {
    return (
      <List.EmptyView
        title="No Repositories Found"
        description="Try adjusting your search terms or check if the repositories exist in your configured organizations."
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
      />
    );
  }

  return (
    <List.EmptyView
      title="Start Searching"
      description="Enter a repository name or keyword to search across your GitHub organizations."
      icon={{ source: Icon.Stars, tintColor: Color.Blue }}
    />
  );
}
