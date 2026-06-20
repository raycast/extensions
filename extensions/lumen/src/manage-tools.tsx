import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Category, getCategories, resetCategories, saveCategories } from "./lib/categories";
import { ResolvedTool, getOrderTools, resetOrderTools, saveOrderTools } from "./lib/commands";
import { ResolvedQualifier, getDateQualifiers, resetDateQualifiers, saveDateQualifiers } from "./lib/dates";

// "pdf, .DOCX , txt" -> ["pdf", "docx", "txt"]. Lowercased, dots stripped, deduped.
function parseExtensions(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const e = part.trim().toLowerCase().replace(/^\.+/, "");
    if (e) seen.add(e);
  }
  return [...seen];
}

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tools, setTools] = useState<ResolvedTool[]>([]);
  const [qualifiers, setQualifiers] = useState<ResolvedQualifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    const [cats, ts, qs] = await Promise.all([getCategories(), getOrderTools(), getDateQualifiers()]);
    setCategories(cats);
    setTools(ts);
    setQualifiers(qs);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function removeCategory(c: Category) {
    const ok = await confirmAlert({
      title: `Delete category "${c.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await saveCategories(categories.filter((o) => o.code !== c.code));
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Category deleted" });
  }

  async function restoreCategories() {
    const ok = await confirmAlert({
      title: "Restore default categories?",
      message: "Replaces all categories with the built-in defaults.",
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetCategories();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Defaults restored" });
  }

  async function toggleTool(tool: ResolvedTool) {
    await saveOrderTools(tools.map((o) => (o.id === tool.id ? { ...o, enabled: !o.enabled } : o)));
    await refresh();
  }

  async function restoreTools() {
    const ok = await confirmAlert({
      title: "Restore default tools?",
      message: "Resets every order tool's code and enabled state.",
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetOrderTools();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Defaults restored" });
  }

  async function restoreQualifiers() {
    const ok = await confirmAlert({
      title: "Restore default date filters?",
      message: "Resets every date filter code (today/week/month/year and jan…dec).",
      primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetDateQualifiers();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Defaults restored" });
  }

  const restoreCategoriesAction = (
    <Action
      title={"Restore Default Categories"}
      icon={Icon.ArrowCounterClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={restoreCategories}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={"Manage Tools"}>
      <List.Section title={"Categories"} subtitle={"Filter files by type with -code"}>
        {categories.map((c) => (
          <List.Item
            key={c.code}
            icon={Icon.Tag}
            title={c.name}
            subtitle={`-${c.code}`}
            accessories={[{ text: c.extensions.join(" ") }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={"Edit Category"}
                  icon={Icon.Pencil}
                  target={<CategoryForm category={c} categories={categories} onSaved={refresh} />}
                />
                <Action.Push
                  title={"Create Category"}
                  icon={Icon.Plus}
                  target={<CategoryForm categories={categories} onSaved={refresh} />}
                />
                <Action
                  title={"Delete Category"}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => removeCategory(c)}
                />
                {restoreCategoriesAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={"Order Tools"} subtitle={"Sort/filter results with --code"}>
        {tools.map((tool) => (
          <List.Item
            key={tool.id}
            icon={Icon.Filter}
            title={tool.label}
            subtitle={`--${tool.code}`}
            accessories={[{ tag: tool.enabled ? { value: "On" } : { value: "Off", color: "#888" } }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={"Edit Tool"}
                  icon={Icon.Pencil}
                  target={<ToolForm tool={tool} tools={tools} onSaved={refresh} />}
                />
                <Action
                  title={tool.enabled ? "Disable Tool" : "Enable Tool"}
                  icon={tool.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={() => toggleTool(tool)}
                />
                <Action
                  title={"Restore Default Tools"}
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={restoreTools}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={"Date Filters"} subtitle={"Args for --dc/--dm (e.g. --dc,month or --dc,mar,2024)"}>
        {qualifiers.map((q) => (
          <List.Item
            key={q.id}
            icon={q.kind === "month" ? Icon.Calendar : Icon.Clock}
            title={q.label}
            subtitle={q.code}
            accessories={[{ tag: q.kind === "month" ? "Month" : "Window" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={"Edit Date Filter"}
                  icon={Icon.Pencil}
                  target={<QualifierForm qualifier={q} qualifiers={qualifiers} onSaved={refresh} />}
                />
                <Action
                  title={"Restore Default Date Filters"}
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={restoreQualifiers}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CategoryForm({
  category,
  categories,
  onSaved,
}: {
  category?: Category;
  categories: Category[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; code: string; extensions: string }) {
    const name = values.name.trim();
    const code = values.code.trim().toLowerCase().replace(/^-+/, "");
    const extensions = parseExtensions(values.extensions);
    if (!name) return void showToast({ style: Toast.Style.Failure, title: "Name is required" });
    if (!code) return void showToast({ style: Toast.Style.Failure, title: "Code is required" });
    if (extensions.length === 0)
      return void showToast({ style: Toast.Style.Failure, title: "At least one extension is required" });

    const collision = categories.find((o) => o.code === code && o.code !== category?.code);
    if (collision)
      return void showToast({
        style: Toast.Style.Failure,
        title: `Code "-${code}" already used by ${collision.name}`,
      });

    const next = category
      ? categories.map((o) => (o.code === category.code ? { name, code, extensions } : o))
      : [...categories, { name, code, extensions }];
    await saveCategories(next);
    onSaved();
    await showToast({
      style: Toast.Style.Success,
      title: category ? "Category updated" : "Category created",
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save Category"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={"Name"} placeholder="Documents" defaultValue={category?.name} />
      <Form.TextField
        id="code"
        title={"Code"}
        placeholder="d"
        info={"Typed after a dash, e.g. -d. Must be unique."}
        defaultValue={category?.code}
      />
      <Form.TextField
        id="extensions"
        title={"Extensions"}
        placeholder="pdf, docx, txt"
        info={"Comma-separated. Dots optional, lowercased on save."}
        defaultValue={category?.extensions.join(", ")}
      />
    </Form>
  );
}

function ToolForm({ tool, tools, onSaved }: { tool: ResolvedTool; tools: ResolvedTool[]; onSaved: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { code: string; enabled: boolean }) {
    const code = values.code.trim().toLowerCase().replace(/^-+/, "");
    if (!code) return void showToast({ style: Toast.Style.Failure, title: "Code is required" });

    const collision = tools.find((o) => o.code === code && o.id !== tool.id);
    if (collision)
      return void showToast({
        style: Toast.Style.Failure,
        title: `Code "--${code}" already used by ${collision.label}`,
      });

    await saveOrderTools(tools.map((o) => (o.id === tool.id ? { ...o, code, enabled: values.enabled } : o)));
    onSaved();
    await showToast({ style: Toast.Style.Success, title: "Tool updated" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save Tool"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`${tool.label} — sorts results by this field.`} />
      <Form.TextField
        id="code"
        title={"Code"}
        placeholder={tool.defaultCode}
        info={"Typed after a double dash, e.g. --dc. Must be unique."}
        defaultValue={tool.code}
      />
      <Form.Checkbox id="enabled" label={"Enabled"} defaultValue={tool.enabled} />
    </Form>
  );
}

function QualifierForm({
  qualifier,
  qualifiers,
  onSaved,
}: {
  qualifier: ResolvedQualifier;
  qualifiers: ResolvedQualifier[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { code: string }) {
    const code = values.code.trim().toLowerCase().replace(/^-+/, "");
    if (!code) return void showToast({ style: Toast.Style.Failure, title: "Code is required" });
    if (/^\d{4}$/.test(code))
      return void showToast({ style: Toast.Style.Failure, title: "A 4-digit code clashes with year filtering" });

    const collision = qualifiers.find((o) => o.code === code && o.id !== qualifier.id);
    if (collision)
      return void showToast({
        style: Toast.Style.Failure,
        title: `Code "${code}" already used by ${collision.label}`,
      });

    await saveDateQualifiers(qualifiers.map((o) => (o.id === qualifier.id ? { ...o, code } : o)));
    onSaved();
    await showToast({ style: Toast.Style.Success, title: "Date filter updated" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save Date Filter"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`${qualifier.label} — used as a --dc/--dm argument.`} />
      <Form.TextField
        id="code"
        title={"Code"}
        placeholder={qualifier.defaultCode}
        info={"Typed after a date command, e.g. --dc,today. Must be unique; can't be 4 digits."}
        defaultValue={qualifier.code}
      />
    </Form>
  );
}
