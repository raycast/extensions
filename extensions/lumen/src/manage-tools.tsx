import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Category, getCategories, resetCategories, saveCategories } from "./lib/categories";
import { ResolvedTool, getOrderTools, resetOrderTools, saveOrderTools } from "./lib/commands";
import { ResolvedQualifier, getDateQualifiers, resetDateQualifiers, saveDateQualifiers } from "./lib/dates";
import { languageTemplate, saveCustomLanguage, t } from "./lib/i18n";

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
  const language = getPreferenceValues<{ language?: string }>().language ?? "en";

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
      title: t("mt.cat.deleteConfirm", { name: c.name }),
      primaryAction: { title: t("common.delete"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await saveCategories(categories.filter((o) => o.code !== c.code));
    await refresh();
    await showToast({ style: Toast.Style.Success, title: t("mt.cat.toast.deleted") });
  }

  async function restoreCategories() {
    const ok = await confirmAlert({
      title: t("mt.cat.restoreConfirm.title"),
      message: t("mt.cat.restoreConfirm.msg"),
      primaryAction: { title: t("common.restore"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetCategories();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: t("common.defaultsRestored") });
  }

  async function toggleTool(tool: ResolvedTool) {
    await saveOrderTools(tools.map((o) => (o.id === tool.id ? { ...o, enabled: !o.enabled } : o)));
    await refresh();
  }

  async function restoreTools() {
    const ok = await confirmAlert({
      title: t("mt.tool.restoreConfirm.title"),
      message: t("mt.tool.restoreConfirm.msg"),
      primaryAction: { title: t("common.restore"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetOrderTools();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: t("common.defaultsRestored") });
  }

  async function restoreQualifiers() {
    const ok = await confirmAlert({
      title: t("mt.date.restoreConfirm.title"),
      message: t("mt.date.restoreConfirm.msg"),
      primaryAction: { title: t("common.restore"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetDateQualifiers();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: t("common.defaultsRestored") });
  }

  async function exportTemplate() {
    const path = join(homedir(), "Downloads", "lumen-language-template.json");
    await writeFile(path, languageTemplate(), "utf8");
    await showToast({ style: Toast.Style.Success, title: t("mt.lang.templateSaved"), message: path });
  }

  const restoreCategoriesAction = (
    <Action
      title={t("mt.cat.restore")}
      icon={Icon.ArrowCounterClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={restoreCategories}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={t("mt.nav")}>
      <List.Section title={t("mt.cat.section")} subtitle={t("mt.cat.section.sub")}>
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
                  title={t("mt.cat.edit")}
                  icon={Icon.Pencil}
                  target={<CategoryForm category={c} categories={categories} onSaved={refresh} />}
                />
                <Action.Push
                  title={t("mt.cat.create")}
                  icon={Icon.Plus}
                  target={<CategoryForm categories={categories} onSaved={refresh} />}
                />
                <Action
                  title={t("mt.cat.delete")}
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

      <List.Section title={t("mt.tool.section")} subtitle={t("mt.tool.section.sub")}>
        {tools.map((tool) => (
          <List.Item
            key={tool.id}
            icon={Icon.Filter}
            title={tool.label}
            subtitle={`--${tool.code}`}
            accessories={[
              { tag: tool.enabled ? { value: t("mt.tool.on") } : { value: t("mt.tool.off"), color: "#888" } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("mt.tool.edit")}
                  icon={Icon.Pencil}
                  target={<ToolForm tool={tool} tools={tools} onSaved={refresh} />}
                />
                <Action
                  title={tool.enabled ? t("mt.tool.disable") : t("mt.tool.enable")}
                  icon={tool.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  onAction={() => toggleTool(tool)}
                />
                <Action
                  title={t("mt.tool.restore")}
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  onAction={restoreTools}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={t("mt.date.section")} subtitle={t("mt.date.section.sub")}>
        {qualifiers.map((q) => (
          <List.Item
            key={q.id}
            icon={q.kind === "month" ? Icon.Calendar : Icon.Clock}
            title={q.label}
            subtitle={q.code}
            accessories={[{ tag: q.kind === "month" ? t("mt.date.kind.month") : t("mt.date.kind.window") }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={t("mt.date.edit")}
                  icon={Icon.Pencil}
                  target={<QualifierForm qualifier={q} qualifiers={qualifiers} onSaved={refresh} />}
                />
                <Action
                  title={t("mt.date.restore")}
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={restoreQualifiers}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={t("mt.lang.section")} subtitle={t("mt.lang.section.sub")}>
        <List.Item
          icon={Icon.Globe}
          title={t("mt.lang.section")}
          subtitle={t("mt.lang.current", { lang: language })}
          actions={
            <ActionPanel>
              <Action title={t("mt.lang.exportTemplate")} icon={Icon.Download} onAction={exportTemplate} />
              <Action.Push title={t("mt.lang.import")} icon={Icon.Upload} target={<LanguageImportForm />} />
            </ActionPanel>
          }
        />
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
    if (!name) return void showToast({ style: Toast.Style.Failure, title: t("err.nameRequired") });
    if (!code) return void showToast({ style: Toast.Style.Failure, title: t("err.codeRequired") });
    if (extensions.length === 0) return void showToast({ style: Toast.Style.Failure, title: t("err.extRequired") });

    const collision = categories.find((o) => o.code === code && o.code !== category?.code);
    if (collision)
      return void showToast({
        style: Toast.Style.Failure,
        title: t("err.catCodeUsed", { code, name: collision.name }),
      });

    const next = category
      ? categories.map((o) => (o.code === category.code ? { name, code, extensions } : o))
      : [...categories, { name, code, extensions }];
    await saveCategories(next);
    onSaved();
    await showToast({
      style: Toast.Style.Success,
      title: category ? t("mt.cat.toast.updated") : t("mt.cat.toast.created"),
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("mt.cat.save")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t("form.name")} placeholder="Documents" defaultValue={category?.name} />
      <Form.TextField
        id="code"
        title={t("form.code")}
        placeholder="d"
        info={t("form.cat.codeInfo")}
        defaultValue={category?.code}
      />
      <Form.TextField
        id="extensions"
        title={t("form.extensions")}
        placeholder="pdf, docx, txt"
        info={t("form.extensions.info")}
        defaultValue={category?.extensions.join(", ")}
      />
    </Form>
  );
}

function ToolForm({ tool, tools, onSaved }: { tool: ResolvedTool; tools: ResolvedTool[]; onSaved: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { code: string; enabled: boolean }) {
    const code = values.code.trim().toLowerCase().replace(/^-+/, "");
    if (!code) return void showToast({ style: Toast.Style.Failure, title: t("err.codeRequired") });

    const collision = tools.find((o) => o.code === code && o.id !== tool.id);
    if (collision)
      return void showToast({
        style: Toast.Style.Failure,
        title: t("err.toolCodeUsed", { code, label: collision.label }),
      });

    await saveOrderTools(tools.map((o) => (o.id === tool.id ? { ...o, code, enabled: values.enabled } : o)));
    onSaved();
    await showToast({ style: Toast.Style.Success, title: t("mt.tool.toast.updated") });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("mt.tool.save")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("form.tool.desc", { label: tool.label })} />
      <Form.TextField
        id="code"
        title={t("form.code")}
        placeholder={tool.defaultCode}
        info={t("form.tool.codeInfo")}
        defaultValue={tool.code}
      />
      <Form.Checkbox id="enabled" label={t("form.enabled")} defaultValue={tool.enabled} />
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
    if (!code) return void showToast({ style: Toast.Style.Failure, title: t("err.codeRequired") });
    if (/^\d{4}$/.test(code)) return void showToast({ style: Toast.Style.Failure, title: t("err.qualFourDigits") });

    const collision = qualifiers.find((o) => o.code === code && o.id !== qualifier.id);
    if (collision)
      return void showToast({
        style: Toast.Style.Failure,
        title: t("err.qualCodeUsed", { code, label: collision.label }),
      });

    await saveDateQualifiers(qualifiers.map((o) => (o.id === qualifier.id ? { ...o, code } : o)));
    onSaved();
    await showToast({ style: Toast.Style.Success, title: t("mt.date.toast.updated") });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("mt.date.save")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("form.date.desc", { label: qualifier.label })} />
      <Form.TextField
        id="code"
        title={t("form.code")}
        placeholder={qualifier.defaultCode}
        info={t("form.date.codeInfo")}
        defaultValue={qualifier.code}
      />
    </Form>
  );
}

function LanguageImportForm() {
  const { pop } = useNavigation();

  async function handleSubmit(values: { file: string[] }) {
    const file = values.file[0];
    if (!file) return void showToast({ style: Toast.Style.Failure, title: t("ex.importPick") });
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad");
    } catch {
      return void showToast({ style: Toast.Style.Failure, title: t("mt.lang.importInvalid") });
    }
    await saveCustomLanguage(parsed);
    await showToast({ style: Toast.Style.Success, title: t("mt.lang.imported") });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("mt.lang.import")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title={t("ex.fileTitle")}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
      <Form.Description text={t("mt.lang.importDesc")} />
    </Form>
  );
}
