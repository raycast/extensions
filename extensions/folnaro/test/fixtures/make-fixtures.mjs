// Writes the JSON-RPC fixtures the mock helper replays. Shapes follow the output schemas in
// docs/mcp/*.md; error texts are copied from the helper's string catalogs
// (mac/Packages/FolnaroKit/Sources/FolnaroMCP/Resources/Localizable.xcstrings and FolnaroData).
// All names are a fictional demo business. Run: node test/fixtures/make-fixtures.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// MARK: - Envelopes

const ok = (structured) => ({
  result: { content: [{ type: "text", text: JSON.stringify(structured) }], isError: false, structuredContent: structured },
});
const toolError = (text) => ({ result: { content: [{ type: "text", text }], isError: true } });
const call = (name, structured, extra = {}) => ({ request: { method: "tools/call", params: { name, ...(extra.arguments ? { arguments: extra.arguments } : {}) } }, response: ok(structured), repeat: extra.repeat ?? true });
const failing = (name, text, extra = {}) => ({ request: { method: "tools/call", params: { name } }, response: toolError(text), repeat: extra.repeat ?? true });
const toolsList = (names) => ({
  request: { method: "tools/list" },
  response: { result: { tools: names.map((name) => ({ name, description: `${name} (mock)`, inputSchema: { type: "object", properties: {}, additionalProperties: false } })) } },
  repeat: true,
});

// Texts from the catalogs, English and German.
export const TEXT = {
  permissionTimeEn: "Agents may not use “time_start_timer”. Allow “Track time” in Folnaro under Settings > Agents (setting mcp.permissions).",
  permissionDraftDe: "Agenten dürfen „documents_create_draft“ nicht verwenden. Erlaube „Kunden und Entwürfe anlegen und bearbeiten“ in Folnaro unter „Einstellungen“ > „Agenten“ (Einstellung mcp.permissions).",
  lockedEn: "Folnaro is in read-only mode because the trial has ended or the subscription has lapsed. Reading and export keep working (GoBD retention). To create new documents, expenses and time entries again, ask the user to unlock Folnaro in the app.",
  lockedDe: "Folnaro ist im Lesemodus, weil die Testphase abgelaufen oder das Abo beendet ist. Lesen und Exportieren funktionieren weiter (Aufbewahrung nach GoBD). Für neue Dokumente, Ausgaben und Zeiten bitte den Nutzer, Folnaro in der App freizuschalten.",
  timerRunningEn: "A timer is already running. Stop it first.",
  timerRunningDe: "Es läuft schon ein Timer. Stoppe ihn zuerst.",
  noTimerEn: "No timer is running.",
  noTimerDe: "Gerade läuft kein Timer.",
  duplicateReceiptEn: "You already imported this receipt. Look for it under Expenses.",
};

const READ_TOOLS = ["documents_list", "documents_pdf", "customers_search", "projects_list", "expenses_list", "time_running", "time_list"];
const WRITE_TOOLS = ["documents_create_draft", "expenses_create", "expenses_add_receipt_file", "expenses_delete", "time_start_timer", "time_stop_timer"];

// MARK: - Demo data

const address = (street, postal_code, city) => ({ street, addition: "", postal_code, city, country_code: "DE" });
const customer = (id, number, display_name, extra = {}) => ({
  id, number, display_name, company: display_name, contact_name: "", email: "", phone: "", vat_id: "", kind: "business",
  language: "de", is_archived: false, hourly_rate: null, payment_term_days: 14, address: address("Hafenstraße 12", "20457", "Hamburg"), ...extra,
});

export const CUSTOMERS = [
  customer("C-NORD", "K-1001", "Nordlicht Medien GmbH", { contact_name: "Jana Albers", email: "rechnung@nordlicht.example", phone: "+49 40 1234567", vat_id: "DE123456789", hourly_rate: "95.00", address: address("Speicherstadt 4", "20457", "Hamburg") }),
  customer("C-HAFEN", "K-1002", "Hafenblick Architekten", { contact_name: "Malte Brandt", email: "buero@hafenblick.example", address: address("Elbchaussee 88", "22763", "Hamburg") }),
  customer("C-GRUEN", "K-1003", "Grünwerk e.V.", { email: "kasse@gruenwerk.example", address: address("Lindenallee 3", "04109", "Leipzig") }),
  customer("C-ELBE", "K-1004", "Elbe Robotics GmbH", { email: "ap@elbe-robotics.example", vat_id: "DE987654321", hourly_rate: "110.00", address: address("Am Kai 7", "01067", "Dresden") }),
  customer("C-SONNE", "K-1005", "Café Sonnendeck", { kind: "business", email: "hallo@sonnendeck.example", address: address("Uferweg 1", "24103", "Kiel") }),
];

const project = (id, number, name, customer_id, extra = {}) => ({
  id, number, name, customer_id, status: "active", is_archived: false, hourly_rate: null, budget_amount: null, budget_hours: null,
  activities: ["Konzept", "Design", "Entwicklung", "Abstimmung"], color: "teal", notes: "", ...extra,
});

export const PROJECTS = [
  project("P-WEB", "P-2026-07", "Website-Relaunch", "C-NORD", { hourly_rate: "95.00", budget_amount: "12000.00", budget_hours: "120" }),
  project("P-BRAND", "P-2026-08", "Markenauftritt 2027", "C-HAFEN", { hourly_rate: "90.00" }),
  project("P-APP", "P-2026-09", "App-Prototyp", "C-ELBE", { hourly_rate: "110.00", budget_hours: "80" }),
  project("P-NEWS", "P-2026-10", "Newsletter-Vorlagen", "C-GRUEN", { status: "planned" }),
  project("P-OLD", "P-2025-03", "Messestand 2025", "C-NORD", { status: "done" }),
];

const money = (name, cents) => ({ [name]: (cents / 100).toFixed(2), [`${name}_cents`]: cents });
const doc = (id, kind, number, status, customerId, title, issue_date, due_date, net, extra = {}) => {
  const tax = Math.round(net * 0.19);
  const gross = net + tax;
  const paid = status === "paid" ? gross : (extra.paid ?? 0);
  const c = CUSTOMERS.find((item) => item.id === customerId);
  return {
    id, kind, number, status, customer_id: customerId, customer_name: c.display_name, project_id: extra.project_id ?? null, title,
    issue_date, due_date, is_draft: status === "draft", is_overdue: extra.is_overdue ?? false, days_overdue: extra.days_overdue ?? 0,
    is_queued_for_number: false, related_document_id: null, tax_treatment: "standard",
    ...money("net_total", net), ...money("tax_total", tax), ...money("gross_total", gross), ...money("paid_total", paid), ...money("open_amount", gross - paid),
  };
};

export const DOCUMENTS = [
  doc("D-142", "invoice", "RE-2026-0142", "sent", "C-NORD", "Website-Relaunch, Phase 2", "2026-10-02", "2026-10-16", 456000, { project_id: "P-WEB" }),
  doc("D-139", "invoice", "RE-2026-0139", "sent", "C-HAFEN", "Markenworkshop September", "2026-09-12", "2026-09-26", 180000, { is_overdue: true, days_overdue: 13, project_id: "P-BRAND" }),
  doc("D-141", "invoice", "RE-2026-0141", "partiallyPaid", "C-ELBE", "App-Prototyp, Sprint 3", "2026-09-30", "2026-10-14", 330000, { paid: 200000, project_id: "P-APP" }),
  doc("D-137", "invoice", "RE-2026-0137", "paid", "C-GRUEN", "Jahresbericht Layout", "2026-09-01", "2026-09-15", 98000),
  doc("D-DRAFT", "invoice", null, "draft", "C-SONNE", "Speisekarte und Aushänge", "2026-10-09", null, 64000),
  doc("D-Q31", "quote", "AN-2026-031", "sent", "C-ELBE", "App-Prototyp, Sprint 4 und 5", "2026-10-06", null, 660000),
  doc("D-Q29", "quote", "AN-2026-029", "accepted", "C-HAFEN", "Markenauftritt 2027", "2026-09-18", null, 940000),
];

const expense = (id, vendor, date, status, category, category_title, grossCents, extra = {}) => {
  const net = Math.round(grossCents / 1.19);
  return {
    id, vendor, date, status, category, category_title, vat_mode: "domestic", tax_rate: "19", currency_code: "EUR", invoice_number: extra.invoice_number ?? "",
    note: extra.note ?? "", has_receipt: extra.has_receipt ?? true, receipt_original_name: extra.receipt_original_name ?? null, project_id: null,
    business_share_percent: "100", is_collective: false, is_standing: false,
    ...money("gross_amount", grossCents), ...money("net_amount", net), ...money("tax_amount", grossCents - net), ...money("deductible_input_tax", grossCents - net),
  };
};

export const EXPENSES = [
  expense("E-1", "Wolkenhost GmbH", "2026-10-01", "booked", "telecom", "Telefon, Internet, Hosting", 4641, { invoice_number: "WH-88213", receipt_original_name: "2026-10-01_Wolkenhost_Rechnung.pdf" }),
  expense("E-2", "Typoladen", "2026-09-28", "booked", "software", "Software und Lizenzen", 11900, { invoice_number: "TL-2026-4471", receipt_original_name: "Typoladen_Lizenz.pdf" }),
  expense("E-3", "Papeterie Nord", "2026-10-07", "inbox", "office", "Bürobedarf", 3570, { note: "Skizzenbücher" }),
  expense("E-4", "Regiobahn", "2026-10-05", "inbox", "travelFares", "Fahrtkosten (Bahn, Flug, Taxi)", 6990, { has_receipt: false }),
];

const entry = (id, project_id, customer_id, date, minutes, extra = {}) => ({
  id, date, duration_seconds: minutes * 60, duration_minutes: minutes, hours: (minutes / 60).toFixed(2), is_running: false, is_billable: true,
  started_at: `${date}T09:00:00+02:00`, ended_at: `${date}T10:00:00+02:00`, customer_id, project_id, activity: extra.activity ?? "", note: extra.note ?? "",
  hourly_rate: null, status: "approved", billed_document_id: null,
});

export const ENTRIES = [
  entry("T-5", "P-APP", "C-ELBE", "2026-10-08", 210, { activity: "Entwicklung" }),
  entry("T-4", "P-WEB", "C-NORD", "2026-10-08", 95, { activity: "Design", note: "Startseite" }),
  entry("T-3", null, "C-SONNE", "2026-10-07", 60, { note: "Telefonat Speisekarte" }),
  entry("T-2", "P-BRAND", "C-HAFEN", "2026-10-06", 180, { activity: "Konzept" }),
  entry("T-1", "P-WEB", "C-NORD", "2026-10-05", 120, { activity: "Design" }),
];

export const RUNNING = {
  ...entry("T-RUN", "P-WEB", "C-NORD", "2026-10-09", 47, { activity: "Design", note: "Logo-Varianten" }),
  is_running: true, started_at: "2026-10-09T09:12:00+02:00", ended_at: null,
};

const searchExchanges = [
  call("documents_list", { count: DOCUMENTS.length, total_count: DOCUMENTS.length, documents: DOCUMENTS }),
  call("customers_search", { count: CUSTOMERS.length, customers: CUSTOMERS }),
  call("projects_list", { count: PROJECTS.length, projects: PROJECTS }),
  call("expenses_list", { count: EXPENSES.length, expenses: EXPENSES }),
  call("time_list", { count: ENTRIES.length, entries: ENTRIES, total_hours: "11.08" }),
];

// MARK: - Fixtures

const fixtures = {
  // Everything allowed, a timer running: Store screenshots, the search tests and trying the
  // extension with "Helper Path" set to the mock. Writes answer but change nothing.
  "demo.json": {
    exchanges: [
      toolsList([...READ_TOOLS, ...WRITE_TOOLS]),
      ...searchExchanges,
      call("time_running", { entry: RUNNING }),
      call("time_start_timer", { entry: { ...RUNNING, started_at: "2026-10-09T10:00:00+02:00", duration_seconds: 0, duration_minutes: 0 } }),
      call("time_stop_timer", { entry: { ...RUNNING, is_running: false, ended_at: "2026-10-09T09:59:00+02:00" } }),
      call("documents_create_draft", { document: { ...DOCUMENTS[4], lines: [] } }),
      call("expenses_create", { expense: { ...EXPENSES[2], id: "E-NEW", has_receipt: false } }),
      call("expenses_add_receipt_file", { expense: { ...EXPENSES[2], id: "E-NEW" }, file: { id: "F-1", page_order: 0 } }),
      call("documents_pdf", { document_id: "D-142", number: "RE-2026-0142", file_name: "RE-2026-0142.pdf", mime_type: "application/pdf", size_bytes: 9, sha256: "0".repeat(64), is_draft: false, is_archived: true, archive_path: "2026/RE-2026-0142.pdf", embeds_e_invoice: false, resource_uri: "folnaro://document/D-142/pdf" }),
    ],
  },
  // Start: nothing runs yet; time_start_timer answers with the new running entry.
  "timer-start.json": {
    exchanges: [
      toolsList([...READ_TOOLS, ...WRITE_TOOLS]),
      ...searchExchanges,
      call("time_running", { entry: null }),
      call("time_start_timer", { entry: { ...RUNNING, started_at: "2026-10-09T10:00:00+02:00", duration_seconds: 0, duration_minutes: 0 } }, { arguments: { project_id: "P-WEB" } }),
    ],
  },
  "timer-stop.json": {
    exchanges: [
      ...searchExchanges,
      call("time_stop_timer", { entry: { ...RUNNING, is_running: false, ended_at: "2026-10-09T10:47:00+02:00", duration_seconds: 5700, duration_minutes: 95, hours: "1.58" } }, { repeat: false }),
      failing("time_stop_timer", TEXT.noTimerEn),
    ],
  },
  "timer-not-running-de.json": { exchanges: [failing("time_stop_timer", TEXT.noTimerDe)] },
  "timer-already-running.json": { exchanges: [failing("time_start_timer", TEXT.timerRunningEn)] },
  // Read-only mode after the trial: the write tools stay listed and answer with the lock text.
  "locked.json": {
    exchanges: [
      toolsList([...READ_TOOLS, ...WRITE_TOOLS]),
      failing("time_start_timer", TEXT.lockedEn),
      failing("expenses_create", TEXT.lockedDe),
      call("time_stop_timer", { entry: { ...RUNNING, is_running: false, duration_seconds: 600, duration_minutes: 10 } }),
    ],
  },
  // Write switches off: tools/list shows only reads; a call anyway is refused with the switch.
  "permissions-off.json": {
    exchanges: [toolsList(READ_TOOLS), failing("time_start_timer", TEXT.permissionTimeEn), failing("documents_create_draft", TEXT.permissionDraftDe)],
  },
  "receipt-duplicate.json": {
    exchanges: [
      call("expenses_create", { expense: { ...EXPENSES[2], id: "E-NEW", vendor: "Papeterie Nord" } }),
      failing("expenses_add_receipt_file", TEXT.duplicateReceiptEn),
      call("expenses_delete", { deleted: true, id: "E-NEW" }),
    ],
  },
  "receipt-ok.json": {
    exchanges: [
      call("expenses_create", { expense: { ...EXPENSES[2], id: "E-NEW", has_receipt: false } }, { arguments: { status: "inbox", vendor: "Papeterie Nord" } }),
      call("expenses_add_receipt_file", { expense: { ...EXPENSES[2], id: "E-NEW", has_receipt: true }, file: { id: "F-1", original_name: "beleg.pdf", content_type: "application/pdf", page_order: 0, sha256: "0".repeat(64) } }),
    ],
  },
  "timeout.json": { hang: ["tools/call:time_running"], exchanges: [] },
  "crash.json": { exitAfter: "tools/call:time_running", exchanges: [] },
  "hang-initialize.json": { hang: ["initialize"], exchanges: [] },
};

// documents_pdf carries the PDF as an embedded resource next to the JSON.
const pdf = fixtures["demo.json"].exchanges.find((exchange) => exchange.request.params?.name === "documents_pdf");
pdf.response.result.content.push({ type: "resource", resource: { uri: "folnaro://document/D-142/pdf", mimeType: "application/pdf", blob: Buffer.from("%PDF-1.7\n").toString("base64") } });

for (const [name, fixture] of Object.entries(fixtures)) {
  writeFileSync(join(here, name), JSON.stringify(fixture, null, 2) + "\n");
}
console.log(`wrote ${Object.keys(fixtures).length} fixtures`);
