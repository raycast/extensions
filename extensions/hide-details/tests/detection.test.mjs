import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = mkdtempSync(path.join(tmpdir(), "hide-details-detection-test-"));
const binary = path.join(directory, "parity");
after(() => rmSync(directory, { recursive: true, force: true }));

function loadDetection() {
  const source = readFileSync(path.join(root, "src/detection.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function("module", "exports", outputText)(module, module.exports);
  return module.exports;
}

const detection = loadDetection();

before(() => {
  copyFileSync(path.join(root, "tests/detection-parity.swift"), path.join(directory, "main.swift"));
  execFileSync("xcrun", [
    "swiftc",
    "-module-cache-path",
    path.join(directory, "module-cache"),
    path.join(root, "swift/hide-details/Sources/Redaction.swift"),
    path.join(directory, "main.swift"),
    "-o",
    binary,
  ]);
});

const lines = [
  "Contact jane.doe@example.com today",
  "jane . doe @ example . com",
  "Card 4111 1111 1111 1111 exp 12/29",
  "4111.1111.1111.1111",
  "Card 4111111111111111 12 29",
  "Call +1 (415) 555-0132",
  "Ticket 48213 phone 415-555-0132",
  "415 555 0132 415 555 0199",
  "Server 192.168.1.20 port 8080",
  "Host 10 . 0 . 0 . 1",
  "Version 300.1.2.3",
  "sk_live_51HxQabcdef123456",
  "sk live Abc 4242424242424242",
  "ghp_abcdefghijklmnopqrstuvwxyz0123",
  "AKIAABCDEFGHIJKLMNOP",
  "xoxb-1234-5678-abcdef",
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig",
  "Order 1234 5678 9012 3456",
  "Invoice 2024-05-11 total 12.50",
  "Phone 555 0132 and IP 10.1.1.1",
  "No sensitive details here",
  "Zahlung an Müller 4111 1111 1111 1111 ✓",
  "Call 0044 20 7946 0958 now",
];

test("Windows text classification matches the macOS Swift rules", () => {
  const swift = JSON.parse(execFileSync(binary, { input: lines.join("\n") + "\n", encoding: "utf8" }));
  assert.equal(swift.length, lines.length);
  lines.forEach((text, index) => {
    const box = { x: 10, y: 10, width: 100, height: 20 };
    const { hits } = detection.classify([{ text, box, custom: false }], [], {
      categories: new Set(["email", "phone", "card", "secret", "ip", "name"]),
      extraWords: [],
      padding: 0,
      width: 200,
      height: 200,
    });
    const found = new Set(hits.map((hit) => hit.kind));
    const typescript = Object.fromEntries(Object.keys(swift[index]).map((kind) => [kind, found.has(kind)]));
    assert.deepEqual(typescript, swift[index], text);
  });
});

test("Windows classification pads, clamps, and merges regions like Swift", () => {
  const { hits, regions } = detection.classify(
    [
      { text: "Email a@b.co phone 415-555-0132", box: { x: 2.4, y: 3.6, width: 50, height: 10 }, custom: true },
      { text: "Project Nebula", box: { x: 190, y: 190, width: 20, height: 20 }, custom: false },
    ],
    [{ x: 0, y: 0, width: 5, height: 5 }],
    {
      categories: new Set(["email", "phone", "name", "face"]),
      extraWords: ["nebula"],
      padding: 4,
      width: 200,
      height: 200,
    },
  );
  assert.deepEqual(
    hits.map((hit) => [hit.kind, hit.confidenceSource]),
    [
      ["custom", "ocr"],
      ["email", "ocr"],
      ["phone", "ocr"],
      ["name", "rule"],
      ["face", "face"],
    ],
  );
  assert.deepEqual(hits[0].box, { x: 0, y: 0, width: 57, height: 18 });
  assert.deepEqual(hits[3].box, { x: 186, y: 186, width: 14, height: 14 });
  assert.equal(regions.length, 3);
  assert.throws(() => detection.regionBox({ x: 300, y: 0, width: 5, height: 5 }, 0, 200, 200), /outside the image/);
});

test("Windows extra words respect the enabled name category", () => {
  const { hits } = detection.classify(
    [{ text: "Project Nebula", box: { x: 0, y: 0, width: 5, height: 5 }, custom: false }],
    [],
    {
      categories: new Set(["email"]),
      extraWords: ["nebula"],
      padding: 0,
      width: 10,
      height: 10,
    },
  );
  assert.deepEqual(hits, []);
});
