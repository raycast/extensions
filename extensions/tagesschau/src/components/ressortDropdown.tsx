import { List } from "@raycast/api";

interface RessortDropdownProps {
  rssFeeds: Array<{ category: string; title: string; value: string; url: string }>;
  onNewsSelectionChange: (newValue: string) => void;
}

// Render a dropdown menu with all available news categories.
export default function RessortDropdown({ rssFeeds, onNewsSelectionChange }: RessortDropdownProps) {
  // Get all feed categories from the provided feed collection.
  const feedCategories: string[] = [];

  rssFeeds.forEach((feed) => {
    if (!feedCategories.includes(feed.category)) {
      feedCategories.push(feed.category);
    }
  });

  return (
    <List.Dropdown
      tooltip="Select Section"
      storeValue={true}
      onChange={(newValue: string) => {
        onNewsSelectionChange(newValue);
      }}
    >
      {feedCategories.map((category) => (
        <List.Dropdown.Section key={category} title={category}>
          {rssFeeds
            .filter((feed) => feed.category === category)
            .map((feed) => (
              <List.Dropdown.Item key={feed.value} title={feed.title} value={feed.value} />
            ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
