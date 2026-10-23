import { afterEach, describe, expect, it } from "vitest";
import { classifyToolError } from "../src/lib/errors";
import { translator } from "../src/lib/i18n";
import { describeError } from "../src/lib/presentation";
import { startTimerFor } from "../src/lib/timer";
import { harness, toolCalls, type Harness } from "./helpers";
import { McpClient } from "../src/lib/mcp-client";
import { FolnaroApi } from "../src/lib/folnaro";
import { locateHelper } from "../src/lib/locate";

let current: Harness | undefined;
afterEach(() => current?.client.close());

const en = translator("en");
const de = translator("de");

describe("Locked writes (read-only mode after the trial)", () => {
  it("recognizes the English lock text and explains how to unlock", async () => {
    const h = (current = harness("locked.json"));
    const error = await startTimerFor(h.api, { projectId: "P-WEB" }, undefined, false).catch((failure) => failure);
    expect(error.kind).toBe("readOnlyMode");
    const presentation = describeError(error, en);
    expect(presentation).toMatchObject({ title: "Folnaro is in read-only mode", offerOpenFolnaro: true });
    expect(presentation.message).toContain("Unlock Folnaro in the app");
  });

  it("recognizes the German lock text", async () => {
    const h = (current = harness("locked.json"));
    const error = await h.api
      .captureReceipt({ vendor: "Papeterie Nord", gross_amount: "35.70" }, { name: "a.pdf", bytes: Buffer.from("x") })
      .catch((failure) => failure);
    expect(error.kind).toBe("readOnlyMode");
    expect(describeError(error, de).title).toBe("Folnaro ist im Lesemodus");
    // Nothing else was attempted after the refusal.
    expect(toolCalls(h, "expenses_add_receipt_file")).toHaveLength(0);
  });

  it("keeps stopping a timer working", async () => {
    const h = (current = harness("locked.json"));
    await expect(h.api.stopTimer()).resolves.toMatchObject({ is_running: false });
  });
});

describe("Missing permissions", () => {
  it("sees a switched-off write tool in tools/list before any call", async () => {
    const h = (current = harness("permissions-off.json"));
    const tools = await h.api.allowedTools();
    expect(["time_start_timer", "documents_create_draft", "expenses_create"].some((name) => tools.has(name))).toBe(false);
  });

  it("names the switch to turn on, whatever language the helper answers in", async () => {
    const h = (current = harness("permissions-off.json"));
    const timer = await startTimerFor(h.api, { projectId: "P-WEB" }, undefined, false).catch((failure) => failure);
    expect(timer).toMatchObject({ kind: "permissionDenied", permission: "time" });
    expect(describeError(timer, de)).toMatchObject({
      title: "Erlaube erst „Zeiten erfassen“",
      message: "Öffne in Folnaro Einstellungen > Agenten und schalte unter „Was Agenten dürfen“ „Zeiten erfassen“ ein.",
    });
    const draft = await h.api.createDraft({ kind: "invoice", customer_id: "C-NORD" }).catch((failure) => failure);
    expect(draft).toMatchObject({ kind: "permissionDenied", permission: "writeDrafts" });
    expect(describeError(draft, en).title).toBe("Allow “Create and edit drafts” first");
  });

  it("asks to turn on reading when the read switch is off (error.read_not_allowed)", () => {
    // Texts from the helper's catalog; every switch starts off, reading included.
    const english = classifyToolError(
      "customers_search",
      "Agents may not read data in Folnaro yet, so “customers_search” can’t be used. Turn on reading in Folnaro under Settings > Agents (setting mcp.permissions).",
    );
    expect(english).toMatchObject({ kind: "permissionDenied", permission: "read" });
    expect(describeError(english, en)).toMatchObject({
      title: "Allow “Read” first",
      message: "In Folnaro, open Settings > Agents and turn on “Read” under “What agents may do”.",
    });
    const german = classifyToolError(
      "documents_list",
      "Agenten dürfen die Daten in Folnaro noch nicht lesen, deshalb lässt sich „documents_list“ nicht verwenden. Schalte das Lesen in Folnaro unter „Einstellungen“ > „Agenten“ ein (Einstellung mcp.permissions).",
    );
    expect(german).toMatchObject({ kind: "permissionDenied", permission: "read" });
    expect(describeError(german, de).title).toBe("Erlaube erst „Lesen“");
  });

  it("keeps unknown tool errors as the helper wrote them", () => {
    const error = classifyToolError("documents_list", "\"period\" must be a year (2026), a quarter (2026-Q3) or a month (2026-09).");
    expect(error.kind).toBe("tool");
    expect(describeError(error, en).message).toContain("must be a year");
  });
});

describe("Folnaro not installed", () => {
  it("explains the missing app and offers the App Store", async () => {
    let failure: unknown;
    try {
      locateHelper({ exists: () => false, home: "/Users/demo" });
    } catch (error) {
      failure = error;
    }
    expect(describeError(failure, de)).toMatchObject({
      title: "Folnaro ist nicht installiert",
      offerAppStore: true,
    });
  });

  it("explains a helper that cannot be started", async () => {
    const api = new FolnaroApi(new McpClient({ command: "/Applications/Folnaro.app/Contents/MacOS/folnaro-mcp-missing" }));
    const error = await api.runningTimer().catch((failure) => failure);
    api.client.close();
    expect(describeError(error, en).title).toBe("Folnaro’s agent helper is missing");
  });
});

describe("Timeouts", () => {
  it("tells the person to try again in a moment", async () => {
    const h = (current = harness("timeout.json", { requestTimeoutMs: 200 }));
    const error = await h.api.runningTimer().catch((failure) => failure);
    expect(describeError(error, de)).toMatchObject({ title: "Folnaro braucht zu lange" });
  });
});
