import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";

type CategoryPickerViewProps = {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
};

export const CategoryPickerView = ({
  categories,
  selectedCategory,
  onSelect,
}: CategoryPickerViewProps) => {
  const { pop } = useNavigation();

  return (
    <List navigationTitle="Choose Category">
      <List.Section title="Categories">
        {categories.map((category) => (
          <List.Item
            key={category}
            title={category}
            icon={category === selectedCategory ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={`Use ${category}`}
                  onAction={() => {
                    onSelect(category);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};
