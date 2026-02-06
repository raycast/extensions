import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useCategories } from "./lib/hooks/useCategories";

export default function ViewCategories() {
  return (
    <FeatureGuard feature="categories">
      {(apiKey, accountName) => (
        <CategoriesList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function CategoriesList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: categories, isLoading } = useCategories(apiKey);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search categories..."
    >
      {!isLoading && categories && categories.length === 0 && (
        <EmptyView
          title="No Categories"
          description="No expense categories found"
          icon={Icon.Tag}
        />
      )}
      <List.Section
        title="Categories"
        subtitle={`${(categories ?? []).length} categories`}
      >
        {(categories ?? []).map((category) => (
          <List.Item
            key={category.id}
            title={category.name}
            icon={{ source: Icon.Tag, tintColor: Color.Blue }}
            keywords={[category.name]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Category Name"
                  content={category.name}
                />
                <Action.CopyToClipboard
                  title="Copy Category Id"
                  content={category.id}
                />
                <AccountSwitcherActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}