// Calls the binary Raycast compiles from swift/ (assets/compiled_raycast_swift/swift) the same
// way the generated extension code does: `swift <function> <JSON arg>…`, JSON on stdout.
// Skipped until `npm run dev` or `npm run build` has produced it. Never touches Contacts.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const BIN = path.join(__dirname, "..", "assets", "compiled_raycast_swift", "swift");
const skip = !existsSync(BIN) && "run `npm run build` first";

const call = (fn: string, ...args: unknown[]) =>
  JSON.parse(execFileSync(BIN, [fn, ...args.map((a) => JSON.stringify(a))]).toString());

test("detect via the Raycast binary", { skip }, () => {
  const d = call("detect", "Anna Huber\nM: +43 664 123 45 67\nanna@huber.at\nMariahilfer Straße 1, 1060 Wien");
  assert.deepEqual(d.emails, ["anna@huber.at"]);
  assert.equal(d.phones[0].number, "+43 664 123 45 67");
  assert.equal(d.addresses[0].postalCode, "1060");
});

test("UTF-16 offsets match JavaScript string indexing", { skip }, () => {
  const text = "Jürgen Öztürk 👋\nTel +43 1 234 56 78";
  const d = call("detect", text);
  const p = d.phones[0];
  assert.equal(text.substr(p.location, p.length), "+43 1 234 56 78");
});

test("recognizeText via the Raycast binary", { skip }, () => {
  const text: string = call("recognizeText", path.join(__dirname, "fixtures", "card.png"));
  assert.match(text, /Julia Steiner/);
  assert.match(text, /julia\.steiner@donauwerk\.at/);
});

test("vcard via the Raycast binary, null note and address accepted", { skip }, () => {
  const card: string = call("vcard", {
    namePrefix: "",
    givenName: "Anna",
    familyName: "Huber",
    nameSuffix: "",
    organization: "",
    jobTitle: "",
    emails: [{ value: "anna@huber.at", label: "work" }],
    phones: [],
    urls: [],
    address: null,
    note: null,
  });
  assert.match(card, /N:Huber;Anna/);
});

test("errors exit non-zero with a readable message", { skip }, () => {
  const r = spawnSync(BIN, ["recognizeText", JSON.stringify("/does/not/exist.png")]);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout.toString() + r.stderr.toString(), /Cannot read image/);
});
