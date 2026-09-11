import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  useNavigation,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import type { Tag } from "./utils/types";

function AddTagForm({ onSaved }: { onSaved: () => void }) {
  const { pop } = useNavigation();
  const { data: categories } = useCachedPromise(() => toshl.getCategories());

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={async (v: { name: string; type: string; category: string }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await toshl.createTag({
                name: v.name.trim(),
                type: v.type as "expense" | "income",
                category: v.category || undefined,
              });
              showToast({ style: Toast.Style.Success, title: "Tag created" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Coffee" />
      <Form.Dropdown id="type" title="Type" defaultValue="expense">
        <Form.Dropdown.Item value="expense" title="Expense" />
        <Form.Dropdown.Item value="income" title="Income" />
      </Form.Dropdown>
      <Form.Dropdown id="category" title="Primary category" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {(categories || []).map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={`${c.name} (${c.type})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function EditTagForm({ tag, onSaved }: { tag: Tag; onSaved: () => void }) {
  const { pop } = useNavigation();
  const { data: categories } = useCachedPromise(() => toshl.getCategories());

  if (!tag.modified) {
    return (
      <Form navigationTitle="Edit Tag">
        <Form.Description text="Enable “Force Refresh Cache” in preferences, run a command, then try again." />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle="Edit Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (v: { name: string; type: string; category: string }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await toshl.updateTag({
                id: tag.id,
                name: v.name.trim(),
                type: v.type as "expense" | "income",
                category: v.category || undefined,
                modified: tag.modified!,
              });
              showToast({ style: Toast.Style.Success, title: "Tag updated" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={tag.name} />
      <Form.Dropdown id="type" title="Type" defaultValue={tag.type}>
        <Form.Dropdown.Item value="expense" title="Expense" />
        <Form.Dropdown.Item value="income" title="Income" />
      </Form.Dropdown>
      <Form.Dropdown id="category" title="Primary category" defaultValue={tag.category || ""}>
        <Form.Dropdown.Item value="" title="None" />
        {(categories || []).map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={`${c.name} (${c.type})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function ManageTags() {
  const { push } = useNavigation();
  const { data: tags, isLoading, revalidate } = useCachedPromise(() => toshl.getTags());
  const { data: categories } = useCachedPromise(() => toshl.getCategories());

  const catName = (id: string) => categories?.find((c) => c.id === id)?.name || "—";

  async function remove(t: Tag) {
    if (
      await confirmAlert({
        title: "Delete tag",
        message: `Delete “${t.name}”?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await toshl.deleteTag(t.id);
      showToast({ style: Toast.Style.Success, title: "Tag deleted" });
      revalidate();
    }
  }

  return (
    <List
      navigationTitle="Tags"
      isLoading={isLoading}
      searchBarPlaceholder="Filter tags…"
      actions={
        <ActionPanel>
          <Action title="Add Tag" icon={Icon.Plus} onAction={() => push(<AddTagForm onSaved={revalidate} />)} />
        </ActionPanel>
      }
    >
      <List.Section title="Tags">
        {tags?.map((t) => (
          <List.Item
            key={t.id}
            title={t.name}
            subtitle={`${t.type} · ${catName(t.category)}`}
            icon={Icon.Tag}
            actions={
              <ActionPanel>
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditTagForm tag={t} onSaved={revalidate} />)}
                />
                <Action title="Add Tag" icon={Icon.Plus} onAction={() => push(<AddTagForm onSaved={revalidate} />)} />
                <Action title="Delete" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => remove(t)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
