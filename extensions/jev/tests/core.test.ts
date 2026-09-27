import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../src/lib/store";
import { moveDocument, undoMove, recoverMove } from "../src/lib/files";
import { initialData, presetSchema } from "../src/lib/model";
import { wireQuestion, validateAnswers, answerLabel, destinationQuestion } from "../src/lib/questions";
import { importLinks, normalizeURL, searchLinks } from "../src/lib/links";
import { evaluate } from "../src/lib/client";
import { containsCredential } from "../src/lib/input";
import { extractDocument } from "../src/lib/extract";
let root: string;
let store: Store;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "jev-test-"));
  store = new Store(path.join(root, "data"));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(root, { recursive: true, force: true });
});
describe("persistent data", () => {
  it("validates all starter presets and retains edits across reads", async () => {
    initialData().presets.forEach((p) => presetSchema.parse(p));
    await store.update((d) => {
      d.presets[0]!.name = "My feedback";
    });
    expect((await new Store(store.directory).read()).presets[0]!.name).toBe("My feedback");
  });
  it("serializes concurrent writers without losing changes", async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        store.update((d) => {
          d.destinations.push({ id: String(i), name: String(i), kind: "collection", path: "", description: "" });
        }),
      ),
    );
    expect((await store.read()).destinations).toHaveLength(8);
  });
  it("never overwrites corrupt existing data", async () => {
    await fs.mkdir(store.directory);
    await fs.writeFile(store.file, "broken");
    await expect(store.update(() => {})).rejects.toThrow("not replaced");
    expect(await fs.readFile(store.file, "utf8")).toBe("broken");
  });
});
describe("filing and undo", () => {
  async function files() {
    const source = path.join(root, "receipt.txt");
    const folder = path.join(root, "receipts");
    await fs.writeFile(source, "Synthetic purchase receipt");
    await fs.mkdir(folder);
    return { source, folder };
  }
  it("moves a file, persists history, and restores it", async () => {
    const { source, folder } = await files();
    const m = await moveDocument(store, source, folder);
    expect(await fs.readFile(m.destination, "utf8")).toContain("Synthetic");
    await expect(fs.stat(source)).rejects.toMatchObject({ code: "ENOENT" });
    await undoMove(store, m.id);
    expect(await fs.readFile(source, "utf8")).toContain("Synthetic");
    expect((await store.read()).moves[0]!.status).toBe("undone");
  });
  it("never overwrites an existing destination", async () => {
    const { source, folder } = await files();
    await fs.writeFile(path.join(folder, "receipt.txt"), "Existing");
    await expect(moveDocument(store, source, folder)).rejects.toMatchObject({ code: "EEXIST" });
    expect(await fs.readFile(source, "utf8")).toContain("Synthetic");
    expect(await fs.readFile(path.join(folder, "receipt.txt"), "utf8")).toBe("Existing");
  });
  it("refuses undo after the destination is edited", async () => {
    const { source, folder } = await files();
    const m = await moveDocument(store, source, folder);
    await fs.writeFile(m.destination, "Changed");
    await expect(undoMove(store, m.id)).rejects.toThrow("changed");
    expect(await fs.readFile(m.destination, "utf8")).toBe("Changed");
  });
  it("refuses undo when the original path is occupied", async () => {
    const { source, folder } = await files();
    const m = await moveDocument(store, source, folder);
    await fs.writeFile(source, "New original");
    await expect(undoMove(store, m.id)).rejects.toMatchObject({ code: "EEXIST" });
    expect(await fs.readFile(source, "utf8")).toBe("New original");
    expect(await fs.readFile(m.destination, "utf8")).toContain("Synthetic");
  });
  it("refuses symlinks and missing folders", async () => {
    const { source, folder } = await files();
    const symlink = path.join(root, "alias.txt");
    await fs.symlink(source, symlink);
    await expect(moveDocument(store, symlink, folder)).rejects.toThrow("regular files");
    await expect(moveDocument(store, source, path.join(root, "missing"))).rejects.toThrow();
  });
  it("reconciles an interrupted journal without moving files", async () => {
    const { source, folder } = await files();
    const m = await moveDocument(store, source, folder);
    await store.update((d) => {
      d.moves[0]!.status = "pending";
    });
    await recoverMove(store, m.id);
    expect((await store.read()).moves[0]!.status).toBe("moved");
  });
});
describe("question contract", () => {
  it("uses option IDs so unusual labels cannot affect the wire schema", () => {
    const q = initialData().presets[0]!.questions[0]!;
    const wire = wireQuestion(q);
    expect(wire.type).toBe("choice");
    if (wire.type === "choice") expect(wire.criteria.o0).toContain("Bug report");
  });
  it("rejects missing answers, unknown choices, invalid scores and probabilities", () => {
    expect(() => validateAnswers({}, { x: { type: "noul", instructions: "Test" } })).toThrow();
    expect(() =>
      validateAnswers({ x: { type: "noul", noul: 1.1 } }, { x: { type: "noul", instructions: "Test" } }),
    ).toThrow();
    expect(() =>
      validateAnswers(
        { x: { type: "choice", choice: "unknown", confidence: 1, probabilities: { a: 1 } } },
        { x: { type: "choice", instructions: "Test", criteria: { a: "A" } } },
      ),
    ).toThrow();
    expect(() =>
      validateAnswers(
        { x: { type: "score", score: 3, confidence: 1, probabilities: { 0: 1, 1: 0 } } },
        { x: { type: "score", instructions: "Test", criteria: ["A", "B"] } },
      ),
    ).toThrow();
  });
  it("keeps ambiguous yes/no answers uncertain", () => {
    expect(answerLabel(initialData().presets[1]!.questions[0]!, { type: "noul", noul: 0.5 })).toBe("Uncertain");
  });
  it("includes a no-match destination and never a made-up folder", () => {
    const q = destinationQuestion([
      { id: "receipts", name: "Receipts", description: "Purchase receipts", kind: "folder", path: "/tmp/receipts" },
    ]);
    expect(q.type === "choice" && q.criteria.none).toBeTruthy();
  });
});
describe("links", () => {
  it("imports Netscape HTML with entities, deduplicates, and skips executable URLs", () => {
    const links = importLinks(
      '<DL><DT><A HREF="https://example.com">A &amp; B</A><DT><A HREF="https://example.com">Duplicate</A><DT><A HREF="javascript:alert(1)">Bad</A></DL>',
      "reference",
    );
    expect(links).toHaveLength(1);
    expect(links[0]!.title).toBe("A & B");
  });
  it("round-trips exported links into a selected collection", () => {
    const links = importLinks('[{"url":"https://example.com","title":"Docs","tags":["NAS"]}]', "reference");
    expect(importLinks(JSON.stringify({ links }), "development")[0]!.collectionId).toBe("development");
    expect(searchLinks(links, "nas", [])).toHaveLength(1);
  });
  it("rejects credentials and unsupported protocols", () => {
    expect(() => normalizeURL("https://user:pass@example.com")).toThrow();
    expect(() => normalizeURL("file:///etc/passwd")).toThrow();
  });
});
describe("TypeSafe transport", () => {
  it("sends the documented authenticated request and validates its result", async () => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({
            model: "jev-test",
            answers: { check: { type: "noul", noul: 0.9 } },
            usage: { input_tokens: 12, output_tokens: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await evaluate("test-key", "jev-latest", "Synthetic text", {
      check: { type: "noul", instructions: "Is this text?" },
    });
    expect(result.answers.check).toEqual({ type: "noul", noul: 0.9 });
    expect(fetch.mock.calls[0]![0]).toBe("https://api.typesafe.ai/v1/systemone");
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string).state).toBe("Synthetic text");
  });
  it("fails clearly without a key and does not contact the service", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(evaluate("", "jev-latest", "x", {})).rejects.toThrow("API key");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not expose service error bodies or credentials", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify({ message: "sensitive-request-data" }), { status: 401 }),
    );
    await expect(
      evaluate("test-key", "jev-latest", "x", { x: { type: "noul", instructions: "Test" } }),
    ).rejects.toThrow("rejected the API key");
  });
});
describe("document extraction", () => {
  it("extracts text and explicitly marks truncation", async () => {
    const file = path.join(root, "test.txt");
    await fs.writeFile(file, "x".repeat(25000));
    const result = await extractDocument(file);
    expect(result.text).toHaveLength(24000);
    expect(result.truncated).toBe(true);
  });
  it("rejects unsupported documents while leaving them untouched", async () => {
    const file = path.join(root, "scan.png");
    await fs.writeFile(file, "data");
    await expect(extractDocument(file)).rejects.toThrow("text-based PDFs");
    expect(await fs.readFile(file, "utf8")).toBe("data");
  });
});

describe("PDF packaging", () => {
  it("extracts a real PDF with the embedded worker", async () => {
    const result = await extractDocument(path.join(import.meta.dirname, "fixtures/receipt.pdf"));
    expect(result.text).toContain("Synthetic receipt");
  });
});

describe("credential protection", () => {
  it("recognizes credential selections while allowing normal prose", () => {
    expect(containsCredential("apikey_" + "synthetic".repeat(8))).toBe(true);
    expect(containsCredential("-----BEGIN PRIVATE KEY-----")).toBe(true);
    expect(containsCredential("The app crashes when saving a document.")).toBe(false);
  });
  it("blocks credentials in input or questions before making a network request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const credential = "apikey_" + "synthetic".repeat(8);
    await expect(evaluate("testing-only-key", "jev-latest", credential, {})).rejects.toThrow("credential");
    await expect(
      evaluate("testing-only-key", "jev-latest", "normal input", { q: { type: "noul", instructions: credential } }),
    ).rejects.toThrow("credential");
    await expect(evaluate("testing-only-key", "jev-latest", "testing-only-key", {})).rejects.toThrow("credential");
    expect(fetch).not.toHaveBeenCalled();
  });
});
