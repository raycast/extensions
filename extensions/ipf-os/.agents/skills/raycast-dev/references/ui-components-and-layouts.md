# Raycast UI Components & Layouts

Raycast extensions render using declarative React components imported from `@raycast/api`.

---

## 1. `List` Component

The primary interface for browsing, searching, and filtering items.

### Key Props:
- `isLoading`: Boolean loading indicator in search bar.
- `searchText` & `onSearchTextChange`: Controlled search query.
- `throttle`: Boolean (delays search callbacks for network-backed searches).
- `searchBarPlaceholder`: Text placeholder in top input bar.
- `searchBarAccessory`: Dropdown selector (e.g., `<List.Dropdown>`).
- `isShowingDetail`: Split-view showing item detail on the right.
- `selectedItemId` & `onSelectionChange`: Controlled item selection.
- `filtering`: Custom filtering rules (e.g. `{ keepSectionOrder: true }`).

### Minimal List Pattern:
```tsx
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";

export default function Command() {
  return (
    <List isLoading={false} searchBarPlaceholder="Filter items...">
      <List.Section title="Active Tasks" subtitle="3 items">
        <List.Item
          id="1"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Prepare release notes"
          subtitle="v2.4.0"
          accessories={[
            { text: "High Priority", icon: Icon.ExclamationMark },
            { tag: { value: "Engineering", color: Color.Blue } },
            { date: new Date() }
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://github.com" />
              <Action.CopyToClipboard content="Release notes draft" />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No items found"
        description="Try adjusting your filter or search keywords"
      />
    </List>
  );
}
```

### Split-View List with Detail Preview:
```tsx
<List isShowingDetail>
  <List.Item
    id="item-1"
    title="Ticket #1024"
    detail={
      <List.Item.Detail
        markdown="# Ticket Details\n\nFull description and log trace..."
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Author" text="Joseph Emmanuel" />
            <List.Item.Detail.Metadata.TagList title="Status">
              <List.Item.Detail.Metadata.TagList.Item text="In Progress" color={Color.Yellow} />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Link title="Linear" text="LIN-1024" target="https://linear.app" />
          </List.Item.Detail.Metadata>
        }
      />
    }
    actions={...}
  />
</List>
```

---

## 2. `Detail` Component

Rich markdown view with an optional metadata sidebar and action panel.

### Best Practices:
- Always format markdown headings, tables, code fences, and blockquotes properly.
- Use `Detail.Metadata` for structured attributes (status, tags, assignees, dates, external links).
- Set `isLoading` when fetching markdown body content.

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";

export function TicketDetailView({ ticket }: { ticket: Ticket }) {
  const markdown = `
# ${ticket.title}

${ticket.description}

\`\`\`json
${JSON.stringify(ticket.rawPayload, null, 2)}
\`\`\`
  `;

  return (
    <Detail
      navigationTitle={`Ticket #${ticket.id}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={`#${ticket.id}`} />
          <Detail.Metadata.Label title="Assignee" text={ticket.assignee} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={ticket.status}
              color={ticket.status === "closed" ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Web View" target={ticket.url} text="Open Ticket" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={ticket.url} />
          <Action.CopyToClipboard title="Copy ID" content={ticket.id} />
        </ActionPanel>
      }
    />
  );
}
```

---

## 3. `Form` Component

Input forms with validation, error states, and draft restoration.

### Standard Form Controls:
- `Form.TextField`: Single line text.
- `Form.PasswordField`: Password/secret text.
- `Form.TextArea`: Multiline input (supports `enableMarkdown: true`).
- `Form.Checkbox`: Boolean checkbox.
- `Form.Dropdown`: Select menu with `Form.Dropdown.Item` and `Form.Dropdown.Section`.
- `Form.TagPicker`: Multi-tag selector with `Form.TagPicker.Item`.
- `Form.DatePicker`: Date or DateTime picker (`type={Form.DatePicker.Type.Date}`).
- `Form.FilePicker`: File / folder picker with `allowMultipleSelection`.
- `Form.Separator` & `Form.Description`: Visual grouping and instructions.

### Form with `useForm` from `@raycast/utils`:
```tsx
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface TicketFormValues {
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
}

export default function CreateTicketCommand() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<TicketFormValues>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating ticket..." });
      try {
        await api.createTicket(values);
        toast.style = Toast.Style.Success;
        toast.title = "Ticket created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create ticket";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      title: FormValidation.Required,
      description: (value) => {
        if (!value || value.length < 10) return "Description must be at least 10 characters";
      },
      priority: FormValidation.Required
    },
    initialValues: {
      priority: "medium",
      dueDate: null
    }
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Ticket" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Bug in auth flow" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Steps to reproduce..." {...itemProps.description} />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
      <Form.DatePicker title="Due Date" {...itemProps.dueDate} />
    </Form>
  );
}
```

---

## 4. `ActionPanel` & `Action`

Defines the keyboard-driven action menu for commands.

### Hierarchy & Rules:
1. **Primary Action**: The very first `<Action>` child executes when the user presses `Return` / `Enter`.
2. **Secondary Actions**: Shown in the Action Panel menu (`Cmd+K`).
3. **Sections**: Group related actions using `<ActionPanel.Section title="...">`.
4. **Submenus**: Group secondary options under `<ActionPanel.Submenu title="...">`.
5. **Keyboard Shortcuts**: Use standard shortcuts (`Keyboard.Shortcut.Common.Copy`, `modifiers: ["cmd"], key: "e"`).

### Built-in Action Types:
- `Action.Push`: Push a new React view onto the navigation stack (`target={<DetailView />}`).
- `Action.Pop`: Pop top view from navigation.
- `Action.SubmitForm`: Trigger `useForm` submit handler.
- `Action.OpenInBrowser`: Open target URL in default browser.
- `Action.Open`: Open file with default application.
- `Action.OpenWith`: Open file with application picker.
- `Action.CopyToClipboard`: Copy text/content to clipboard.
- `Action.Paste`: Paste text into the currently active macOS app.
- `Action.ShowInFinder`: Highlight file in Finder.
- `Action.Trash`: Move file to macOS Trash.
- `Action`: Generic action with callback `onAction={() => ...}`.

### Destructive Action Confirmation:
```tsx
<Action
  title="Delete Workspace"
  icon={Icon.Trash}
  style={Action.Style.Destructive}
  shortcut={{ modifiers: ["ctrl"], key: "x" }}
  onAction={async () => {
    const confirmed = await confirmAlert({
      title: "Delete Workspace?",
      message: "This action is permanent and cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive
      }
    });
    if (confirmed) {
      await deleteWorkspace();
    }
  }}
/>
```

---

## 5. `MenuBarExtra`

Menu bar commands render status icons, counts, and interactive menus directly in the macOS menu bar.

```tsx
import { MenuBarExtra, open, Icon } from "@raycast/api";

export default function Command() {
  const unreadCount = 3;

  return (
    <MenuBarExtra
      icon={Icon.Bell}
      title={unreadCount > 0 ? `${unreadCount}` : undefined}
      tooltip="Notification Center"
    >
      <MenuBarExtra.Section title="Unread">
        <MenuBarExtra.Item
          title="PR #42 approved"
          onAction={() => open("https://github.com")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Dashboard"
          onAction={() => open("raycast://extensions/author/ext/dashboard")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
```

---

## 6. Feedback & Notification Primitives

### `showToast`
```tsx
import { showToast, Toast } from "@raycast/api";

const toast = await showToast({
  style: Toast.Style.Animated,
  title: "Syncing data..."
});

// Update in-place:
toast.style = Toast.Style.Success;
toast.title = "Data synced successfully";
toast.message = "14 new records updated";
toast.primaryAction = {
  title: "Open Dashboard",
  onAction: () => open("https://app.example.com")
};
```

### `showHUD`
Displays a quick floating HUD overlay and immediately closes Raycast. Ideal for `no-view` commands and clipboard operations.
```tsx
import { showHUD } from "@raycast/api";

await showHUD("Link copied to clipboard");
```
