// Collects the view data for the Store screenshots by running the extension's own code
// (client, API, search, timer and formatting) against the mock helper with demo data.
// Bundled and run by render.mjs; never part of the extension.
import { join } from "node:path";
import { FolnaroApi } from "../../src/lib/folnaro";
import { documentNumberLabel, documentStatusKey, documentStatusTone, elapsedSeconds, formatClock, formatDate, formatDuration, formatMoney, formatTime } from "../../src/lib/format";
import { t, type StringKey, type Translate } from "../../src/lib/text";
import { McpClient } from "../../src/lib/mcp-client";
import { runSearch } from "../../src/lib/search";
import { SECTION_GROUPS } from "../../src/lib/sections";
import { byId, describeEntry, describeTarget, recentTargets, workableProjects } from "../../src/lib/timer";
import { statusColor } from "../../src/lib/brand";

// `locale` is the number and date format of the shots; the texts are US English only.
export async function collect(root: string, locale: string, now: Date) {
  const client = new McpClient({
    command: process.execPath,
    args: [join(root, "test", "mock-mcp-server.mjs")],
    env: { MOCK_FIXTURE: join(root, "test", "fixtures", "demo.json") },
  });
  const api = new FolnaroApi(client);
  try {
    const results = await runSearch(api, "", "all");
    const [running, projects, customers, entries] = await Promise.all([
      api.runningTimer(),
      api.projects(),
      api.customers({ limit: 500 }),
      api.timeEntries(),
    ]);
    const known = { projects: byId(workableProjects(projects)), customers: byId(customers) };

    const documentRow = (document: (typeof results.invoices)[number]) => ({
      kind: document.kind === "quote" ? "quote" : "invoice",
      title: documentNumberLabel(document),
      subtitle: [document.customer_name, document.title].filter(Boolean).join(" · "),
      due: document.due_date && !document.is_draft && document.status !== "paid" ? formatDate(document.due_date, locale) : "",
      amount: formatMoney(document.gross_total_cents, locale),
      status: t(documentStatusKey(document) as StringKey),
      color: statusColor(documentStatusTone(document)).dark,
      detail: [
        [t("field.kind"), t(`kind.${document.kind}` as StringKey)],
        [t("field.number"), documentNumberLabel(document)],
        [t("field.customer"), document.customer_name ?? ""],
        [t("field.title"), document.title ?? ""],
        ["-", ""],
        [t("field.issueDate"), formatDate(document.issue_date, locale)],
        [t("field.dueDate"), document.due_date ? formatDate(document.due_date, locale) : ""],
        ["-", ""],
        [t("field.net"), formatMoney(document.net_total_cents ?? 0, locale)],
        [t("field.vat"), formatMoney(document.tax_total_cents ?? 0, locale)],
        [t("field.gross"), formatMoney(document.gross_total_cents, locale)],
        [t("field.open"), formatMoney(document.open_amount_cents ?? 0, locale)],
      ].filter(([, value], index, all) => value !== "" || all[index][0] === "-"),
    });

    const search = {
      sections: [
        { title: t("search.section.invoices"), rows: results.invoices.map(documentRow) },
        { title: t("search.section.quotes"), rows: results.quotes.map(documentRow) },
        {
          title: t("search.section.customers"),
          rows: results.customers.slice(0, 4).map((customer) => ({ kind: customer.kind === "person" ? "person" : "building", title: customer.display_name, subtitle: customer.address.city, amount: customer.number })),
        },
        {
          title: t("search.section.expenses"),
          rows: results.expenses.map((expense) => ({
            kind: "cart",
            title: expense.vendor,
            subtitle: expense.category_title ?? "",
            due: formatDate(expense.date, locale),
            amount: formatMoney(expense.gross_amount_cents, locale),
            status: t(`expenseStatus.${expense.status}` as StringKey),
            color: statusColor(expense.status === "booked" ? "paid" : "open").dark,
            clip: expense.has_receipt,
          })),
        },
      ],
    };

    const runningName = running ? describeEntry(running, known) : undefined;
    const elapsed = running ? elapsedSeconds(running, now) : 0;
    const recents = recentTargets([], entries, known).map((target) => describeTarget(target, known));
    const timer = {
      running: running
        ? {
            title: runningName ?? t("timer.withoutProject"),
            subtitle: running.note || running.activity || "",
            since: running.started_at ? t("timer.runningSince", { time: formatTime(running.started_at, locale) }) : "",
            elapsed: formatDuration(elapsed),
            clock: formatClock(elapsed),
          }
        : undefined,
      recents,
      projects: workableProjects(projects)
        .filter((project) => !recents.some((recent) => recent.title === project.name))
        .map((project) => ({ title: project.name, subtitle: known.customers.get(project.customer_id ?? "")?.display_name ?? "", number: project.number ?? "" })),
    };

    const sections = SECTION_GROUPS.map((group) => ({
      title: group.title ? t(group.title) : "",
      items: group.sections.map((section) => ({ title: t(`section.${section.id}` as StringKey), shortcut: `${section.option ? "⌥" : ""}⌘${section.key}` })),
    }));

    return { t: collectStrings(t), search, timer, sections, customers: customers.map((customer) => customer.display_name) };
  } finally {
    client.close();
  }
}

function collectStrings(t: Translate) {
  const keys: StringKey[] = [
    "search.placeholder", "search.scope.all", "action.openInFolnaro", "timer.placeholder", "timer.section.running", "timer.section.recent",
    "timer.section.projects", "timer.start", "timer.stopAndStart", "menu.stop", "menu.start", "menu.openFolnaro", "draft.customer", "draft.title",
    "draft.titlePlaceholder", "draft.serviceStart", "draft.serviceEnd", "draft.line", "draft.lineTitle", "draft.quantity", "draft.unit", "draft.unitPrice",
    "draft.taxRate", "draft.submit", "draft.info", "unit.HUR", "unit.DAY", "receipt.file", "receipt.vendor", "receipt.amount", "receipt.date",
    "receipt.category", "receipt.note", "receipt.submit", "receipt.info", "category.office", "draft.project", "section.placeholder", "section.open",
    "action.quickLookPdf", "field.status",
  ];
  return Object.fromEntries(keys.map((key) => [key, t(key, { index: 1 })]));
}
