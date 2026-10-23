/**
 * Runs the extension's client against the real folnaro-mcp on a temporary database, so tool
 * names, arguments, result shapes and the error texts `classifyToolError` matches are checked
 * against the helper itself, not only against the fixtures.
 *
 * Opt in: build the helper (`cd mac/Packages/FolnaroKit && swift build --product folnaro-mcp`)
 * and run `FOLNARO_MCP_BIN=<path to folnaro-mcp> npm test`. Without the variable the suite is
 * skipped. The database lives in a fresh temp folder (`FOLNARO_DATABASE`), never the App Group.
 * Needs the `sqlite3` command line tool (part of macOS) to set the permission switches.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FolnaroApi, INVOICE_KINDS } from "../src/lib/folnaro";
import { McpClient } from "../src/lib/mcp-client";
import { isFolnaroError, type FolnaroError } from "../src/lib/errors";

const BIN = process.env.FOLNARO_MCP_BIN;

let folder = "";
let database = "";

function setSetting(key: string, value: unknown): void {
  const json = JSON.stringify(value).replace(/'/g, "''");
  execFileSync("sqlite3", [database, `INSERT OR REPLACE INTO device_setting(key, value) VALUES ('${key}', '${json}')`]);
}

function connect(language: "en" | "de" = "en"): { client: McpClient; api: FolnaroApi } {
  const client = new McpClient({
    command: BIN!,
    // The debug helper skips the per-program approval (audit A-7) only when asked.
    env: { FOLNARO_DATABASE: database, FOLNARO_LANGUAGE: language, FOLNARO_MCP_SKIP_APPROVAL: "1" },
    clientName: "raycast-folnaro-test",
  });
  return { client, api: new FolnaroApi(client) };
}

async function failure(promise: Promise<unknown>): Promise<FolnaroError> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  if (!isFolnaroError(error)) throw new Error(`Expected a FolnaroError, got ${String(error)}`);
  return error;
}

describe.skipIf(!BIN)("real folnaro-mcp", () => {
  let customerId = "";
  let projectId = "";

  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "folnaro-raycast-real-"));
    database = join(folder, "folnaro.sqlite");
    // The first start migrates the empty database.
    const { client } = connect();
    await client.start();
    client.close();
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSetting("mcp.permissions", { read: true, writeDrafts: true, expenses: true, time: true });
    setSetting("entitlement.state", { canWrite: true });

    const { client: seed } = connect();
    const customer = await seed.callTool<{ customer: { id: string } }>("customers_create", {
      company: "Nordlicht Medien GmbH",
      street: "Speicherstadt 4",
      postal_code: "20457",
      city: "Hamburg",
      country_code: "DE",
    });
    customerId = customer.data.customer.id;
    const project = await seed.callTool<{ project: { id: string } }>("projects_create", {
      name: "Website-Relaunch",
      customer_id: customerId,
    });
    projectId = project.data.project.id;
    seed.close();
  });

  afterAll(() => {
    if (folder) rmSync(folder, { recursive: true, force: true });
  });

  it("lists the tools the extension needs", async () => {
    const { client, api } = connect();
    try {
      const names = await api.allowedTools();
      for (const name of [
        "documents_list",
        "documents_pdf",
        "documents_create_draft",
        "customers_search",
        "projects_list",
        "expenses_list",
        "expenses_create",
        "expenses_add_receipt_file",
        "expenses_delete",
        "time_running",
        "time_list",
        "time_start_timer",
        "time_stop_timer",
      ]) {
        expect(names, name).toContain(name);
      }
    } finally {
      client.close();
    }
  });

  it("searches customers and projects", async () => {
    const { client, api } = connect();
    try {
      const customers = await api.customers({ query: "Nordlicht" });
      expect(customers.map((customer) => customer.id)).toContain(customerId);
      const customer = customers.find((item) => item.id === customerId)!;
      expect(customer.display_name).toBe("Nordlicht Medien GmbH");
      expect(typeof customer.number).toBe("string");
      expect(customer.address.city).toBe("Hamburg");
      const projects = await api.projects({ customerId });
      expect(projects.map((project) => project.id)).toEqual([projectId]);
      expect(projects[0].name).toBe("Website-Relaunch");
    } finally {
      client.close();
    }
  });

  it("creates an invoice draft, finds it and renders its PDF", async () => {
    const { client, api } = connect();
    try {
      const draft = await api.createDraft({
        kind: "invoice",
        customer_id: customerId,
        project_id: projectId,
        title: "Website-Relaunch Oktober",
        lines: [{ title: "Konzept", quantity: "3", unit: "h", unit_price: "95.00", tax_rate: "19" }],
      });
      expect(draft.is_draft).toBe(true);
      expect(draft.number).toBeNull();
      expect(draft.gross_total).toBe("339.15");
      expect(draft.gross_total_cents).toBe(33915);

      const found = await api.documents({ query: "Oktober", kinds: INVOICE_KINDS });
      const summary = found.find((document) => document.id === draft.id)!;
      expect(summary).toBeDefined();
      expect(summary.customer_name).toBe("Nordlicht Medien GmbH");
      expect(summary.status).toBe("draft");
      expect(typeof summary.issue_date).toBe("string");

      const pdf = await api.documentPdf(draft.id);
      expect(pdf.meta.document_id).toBe(draft.id);
      expect(pdf.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(pdf.meta.size_bytes).toBe(pdf.bytes.length);
    } finally {
      client.close();
    }
  });

  it("starts, shows and stops a timer", async () => {
    const { client, api } = connect();
    try {
      expect(await api.runningTimer()).toBeNull();
      const started = await api.startTimer({ project_id: projectId, note: "Konzept" });
      expect(started.is_running).toBe(true);
      expect(started.project_id).toBe(projectId);
      expect(started.customer_id).toBe(customerId);
      expect(typeof started.started_at).toBe("string");

      expect((await failure(api.startTimer({ project_id: projectId }))).kind).toBe("timerRunning");
      expect((await api.runningTimer())?.id).toBe(started.id);

      const stopped = await api.stopTimer();
      expect(stopped.id).toBe(started.id);
      expect(stopped.is_running).toBe(false);
      expect(typeof stopped.duration_seconds).toBe("number");
      expect((await failure(api.stopTimer())).kind).toBe("timerNotRunning");

      const entries = await api.timeEntries({ limit: 10 });
      expect(entries.map((entry) => entry.id)).toContain(started.id);
    } finally {
      client.close();
    }
  });

  it("recognizes the timer errors in German too", async () => {
    const { client, api } = connect("de");
    try {
      expect((await failure(api.stopTimer())).kind).toBe("timerNotRunning");
      await api.startTimer({ customer_id: customerId });
      expect((await failure(api.startTimer({ customer_id: customerId }))).kind).toBe("timerRunning");
      await api.stopTimer();
    } finally {
      client.close();
    }
  });

  it("captures a receipt into the inbox and refuses the same file twice", async () => {
    const { client, api } = connect();
    try {
      const file = { name: "2026-10-07_Papeterie_Nord.pdf", bytes: Buffer.from("%PDF-1.4\n% demo receipt\n%%EOF\n") };
      const expense = await api.captureReceipt(
        { vendor: "Papeterie Nord", gross_amount: "35.70", date: "2026-10-07" },
        file,
      );
      expect(expense.status).toBe("inbox");
      expect(expense.has_receipt).toBe(true);
      expect(expense.gross_amount).toBe("35.70");
      expect(expense.gross_amount_cents).toBe(3570);

      const duplicate = await failure(api.captureReceipt({ vendor: "Papeterie Nord", gross_amount: "35.70" }, file));
      expect(duplicate.kind).toBe("duplicateReceipt");
      // The second inbox expense was removed again.
      const expenses = await api.expenses({ query: "Papeterie" });
      expect(expenses.map((item) => item.id)).toEqual([expense.id]);
    } finally {
      client.close();
    }
  });

  it("asks for the read switch while reading is off", async () => {
    setSetting("mcp.permissions", { read: false, writeDrafts: true, expenses: true, time: true });
    try {
      for (const language of ["en", "de"] as const) {
        const off = connect(language);
        try {
          const denied = await failure(off.api.customers());
          expect(denied.kind).toBe("permissionDenied");
          expect(denied.permission).toBe("read");
        } finally {
          off.client.close();
        }
      }
    } finally {
      setSetting("mcp.permissions", { read: true, writeDrafts: true, expenses: true, time: true });
    }
  });

  it("names the switch when a permission is off and recognizes read-only mode", async () => {
    setSetting("mcp.permissions", { read: true, writeDrafts: true, expenses: true, time: false });
    const off = connect("de");
    try {
      expect((await off.api.allowedTools()).has("time_start_timer")).toBe(false);
      const denied = await failure(off.api.startTimer({ customer_id: customerId }));
      expect(denied.kind).toBe("permissionDenied");
      expect(denied.permission).toBe("time");
    } finally {
      off.client.close();
      setSetting("mcp.permissions", { read: true, writeDrafts: true, expenses: true, time: true });
    }

    setSetting("entitlement.state", { canWrite: false });
    for (const language of ["en", "de"] as const) {
      const locked = connect(language);
      try {
        expect((await failure(locked.api.startTimer({ customer_id: customerId }))).kind).toBe("readOnlyMode");
        expect((await failure(locked.api.createDraft({ kind: "invoice", customer_id: customerId }))).kind).toBe(
          "readOnlyMode",
        );
        // Reading keeps working.
        expect((await locked.api.customers()).length).toBeGreaterThan(0);
      } finally {
        locked.client.close();
      }
    }
    setSetting("entitlement.state", { canWrite: true });
  });
});
