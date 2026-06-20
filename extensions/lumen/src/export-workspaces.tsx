import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Workspace, getWorkspaces, saveWorkspaces } from "./lib/workspaces";
import { Category, getCategories, saveCategories } from "./lib/categories";
import { getOrderTools, saveOrderTools } from "./lib/commands";
import { getDateQualifiers, saveDateQualifiers } from "./lib/dates";
import { t } from "./lib/i18n";

const ABOUT =
  "Lumen configuration blueprint. Back it up, move it to another Raycast, or hand it to an AI to understand or extend your setup. Each section explains what it is. NOTE: global command hotkeys are managed by Raycast and are NOT included here.";

const DESCRIPTIONS = {
  workspaces:
    "Favorite folders you scope searches to. In Lumen, type an alias (or number) + space to enter one. name: label; path: folder; aliases: short triggers; number: optional numeric trigger.",
  categories:
    "File-type groups, typed as -code to show only those files (e.g. -d for documents). code: the single-dash trigger; extensions: matched file extensions.",
  orderTools:
    "Result ordering, typed as --code (e.g. --dc). Logic is built in (created/modified date, largest/smallest size); you can rename code and toggle enabled.",
  dateFilters:
    "Arguments for the date tools (--dc/--dm), combinable and order-free, e.g. --dc,today or --dc,mar,2024. code: the keyword; kind: window (calendar today/week/month/year) or month (jan…dec). A 4-digit year is always valid too.",
};

interface Section<T> {
  description: string;
  items: T[];
}

interface ExportShape {
  _about: string;
  version: 2;
  workspaces: Section<Workspace>;
  categories: Section<Category>;
  orderTools: Section<{ id: string; label: string; code: string; enabled: boolean }>;
  dateFilters: Section<{ id: string; label: string; code: string; kind: string }>;
}

// Accepts both v2 sections ({ items }) and bare arrays (older exports).
function itemsOf<T>(section: unknown): T[] {
  if (Array.isArray(section)) return section as T[];
  if (section && typeof section === "object" && Array.isArray((section as { items?: unknown }).items)) {
    return (section as { items: T[] }).items;
  }
  return [];
}

export default function Command() {
  const [json, setJson] = useState("");

  useEffect(() => {
    (async () => {
      const [workspaces, categories, tools, qualifiers] = await Promise.all([
        getWorkspaces(),
        getCategories(),
        getOrderTools(),
        getDateQualifiers(),
      ]);
      const shape: ExportShape = {
        _about: ABOUT,
        version: 2,
        workspaces: { description: DESCRIPTIONS.workspaces, items: workspaces },
        categories: { description: DESCRIPTIONS.categories, items: categories },
        orderTools: {
          description: DESCRIPTIONS.orderTools,
          items: tools.map((t) => ({ id: t.id, label: t.label, code: t.code, enabled: t.enabled })),
        },
        dateFilters: {
          description: DESCRIPTIONS.dateFilters,
          items: qualifiers.map((q) => ({ id: q.id, label: q.label, code: q.code, kind: q.kind })),
        },
      };
      setJson(JSON.stringify(shape, null, 2));
    })();
  }, []);

  async function saveToFile() {
    const path = join(homedir(), "Downloads", "lumen-config.json");
    await writeFile(path, json, "utf8");
    await showToast({ style: Toast.Style.Success, title: t("ex.saved"), message: path });
  }

  return (
    <Detail
      markdown={"# " + t("ex.title") + "\n\n```json\n" + json + "\n```"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={t("ex.copy")} content={json} />
          <Action title={t("ex.save")} icon={Icon.Download} onAction={saveToFile} />
          <Action.Push title={t("ex.import")} icon={Icon.Upload} target={<ImportForm />} />
        </ActionPanel>
      }
    />
  );
}

function ImportForm() {
  const { pop } = useNavigation();

  async function handleSubmit(values: { file: string[] }) {
    const file = values.file[0];
    if (!file) return void showToast({ style: Toast.Style.Failure, title: t("ex.importPick") });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch {
      return void showToast({ style: Toast.Style.Failure, title: t("ex.importInvalid") });
    }

    const workspaces = itemsOf<Workspace>(parsed.workspaces);
    const categories = itemsOf<Category>(parsed.categories);
    const tools = itemsOf<{ id: string; code: string; enabled: boolean }>(parsed.orderTools);
    const quals = itemsOf<{ id: string; code: string }>(parsed.dateFilters);
    if (!workspaces.length && !categories.length && !tools.length && !quals.length) {
      return void showToast({ style: Toast.Style.Failure, title: t("ex.importNothing") });
    }

    const sections = [
      workspaces.length && "workspaces",
      categories.length && "categories",
      tools.length && "order tools",
      quals.length && "date filters",
    ].filter(Boolean);
    const ok = await confirmAlert({
      title: t("ex.importConfirm.title"),
      message: t("ex.importConfirm.msg", { sections: sections.join(", ") }),
      primaryAction: { title: t("common.restore"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;

    if (workspaces.length) await saveWorkspaces(workspaces);
    if (categories.length) await saveCategories(categories);
    if (tools.length) {
      const current = await getOrderTools();
      await saveOrderTools(
        current.map((t) => {
          const o = tools.find((x) => x.id === t.id);
          return o ? { ...t, code: o.code, enabled: o.enabled } : t;
        }),
      );
    }
    if (quals.length) {
      const current = await getDateQualifiers();
      await saveDateQualifiers(
        current.map((q) => {
          const o = quals.find((x) => x.id === q.id);
          return o ? { ...q, code: o.code } : q;
        }),
      );
    }
    await showToast({ style: Toast.Style.Success, title: t("ex.imported"), message: sections.join(", ") });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("ex.importAction")} onSubmit={handleSubmit} />
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
      <Form.Description text={t("ex.importFormDesc")} />
    </Form>
  );
}
