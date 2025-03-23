# UI Patterns

This document outlines the UI patterns used throughout the G-Cloud project. Reference this document when implementing new features to maintain consistency in the user interface.

## Component Structure

### View Components

View components follow a consistent pattern:

```typescript
interface ViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string; // Optional: specific resource to view
  resourceType?: string; // Optional: type of resource
}

export default function ResourceView({ projectId, gcloudPath, resourceName, resourceType }: ViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();
  
  // Service initialization
  const service = useMemo(() => new ResourceService(gcloudPath, projectId), [gcloudPath, projectId]);
  
  useEffect(() => {
    fetchResources();
  }, []);
  
  async function fetchResources() {
    // Implementation
  }
  
  // Other functions
  
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search resources..."
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
    >
      {/* List items */}
    </List>
  );
}
```

## List Patterns

### List with Sections

- Group related items into sections
- Use consistent section titles
- Include section accessories when appropriate

```typescript
<List.Section title="Section Title" subtitle={`${items.length} items`}>
  {items.map((item) => (
    <List.Item
      key={item.id}
      title={item.name}
      subtitle={item.description}
      accessories={[
        { text: item.status },
        { icon: getStatusIcon(item.status) }
      ]}
      actions={
        <ActionPanel>
          {/* Actions */}
        </ActionPanel>
      }
    />
  ))}
</List.Section>
```

### List Item Accessories

- Use consistent accessories across similar resources
- Include status indicators, timestamps, and metadata
- Limit to 2-3 accessories to avoid clutter

## Action Panels

### Primary Actions

- Place most common actions first
- Use consistent action ordering across views
- Group related actions together

```typescript
<ActionPanel>
  <ActionPanel.Section>
    <Action
      title="View Details"
      icon={Icon.Eye}
      onAction={() => viewDetails(resource)}
    />
    <Action
      title="Edit Resource"
      icon={Icon.Pencil}
      onAction={() => editResource(resource)}
    />
  </ActionPanel.Section>
  <ActionPanel.Section>
    <Action
      title="Delete Resource"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      onAction={() => deleteResource(resource)}
    />
  </ActionPanel.Section>
</ActionPanel>
```

## Forms

### Form Structure

- Group related fields together
- Use consistent field ordering
- Include validation for all fields
- Provide helpful placeholder text

```typescript
<Form
  actions={
    <ActionPanel>
      <Action.SubmitForm title="Create Resource" onSubmit={handleSubmit} />
    </ActionPanel>
  }
>
  <Form.TextField
    id="name"
    title="Name"
    placeholder="Enter resource name"
    info="Must be unique within the project"
    error={nameError}
    onChange={(value) => validateName(value)}
    required
  />
  {/* Other form fields */}
</Form>
```

## Loading and Error States

### Loading State

- Show loading indicators during data fetching
- Provide context about what's loading
- Use Toast for long-running operations

```typescript
showToast({
  style: Toast.Style.Animated,
  title: "Loading resources...",
  message: `Project: ${projectId}`,
});
```

### Error Handling

- Display clear error messages
- Provide recovery options when possible
- Use appropriate Toast styles for different error types

```typescript
showToast({
  style: Toast.Style.Failure,
  title: "Failed to fetch resources",
  message: error.message,
});
```

## Icons and Visual Indicators

- Use consistent icons for similar actions
- Use color coding for status indicators
- Follow Raycast icon guidelines

```typescript
function getStatusIcon(status: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "active":
      return { source: Icon.Circle, tintColor: Color.Green };
    case "pending":
      return { source: Icon.Circle, tintColor: Color.Yellow };
    case "error":
      return { source: Icon.Circle, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.PrimaryText };
  }
}
``` 