import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";

function CategoryName({ onChange }: { onChange: (value: string | undefined) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Filter by Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Category Filter"
            onSubmit={(values: { name: string }) => {
              if (!values.name.trim()) return false;
              onChange(values.name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Category"
        placeholder="Enter the category shown in Synci"
        info="Matches the full category name, ignoring capitalization."
      />
    </Form>
  );
}

export function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const choices = [...new Set([...categories, ...(value ? [value] : [])])].sort((a, b) => a.localeCompare(b));
  return (
    <ActionPanel.Submenu title="Filter by Category" icon={Icon.Tag}>
      <Action
        title="All Categories"
        icon={value === undefined ? Icon.Checkmark : Icon.Circle}
        onAction={() => onChange(undefined)}
      />
      <Action title="Uncategorized" icon={value === "" ? Icon.Checkmark : Icon.Circle} onAction={() => onChange("")} />
      <ActionPanel.Section title="Categories in Loaded Results">
        {choices.map((category) => (
          <Action
            key={category}
            title={category}
            icon={value === category ? Icon.Checkmark : Icon.Tag}
            onAction={() => onChange(category)}
          />
        ))}
      </ActionPanel.Section>
      <Action.Push
        title="Enter Category Name"
        icon={Icon.MagnifyingGlass}
        target={<CategoryName onChange={onChange} />}
      />
    </ActionPanel.Submenu>
  );
}
