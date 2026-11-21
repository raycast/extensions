// End-to-end: real text -> Swift core (Apple detectors) -> parser.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import type { ContactDraft } from "../src/core/parse";
import { draft as draftSync, ocr } from "./support";

const draft = async (text: string) => draftSync(text);

function expectFields(d: ContactDraft, want: Partial<Record<keyof ContactDraft, unknown>>) {
  for (const [k, v] of Object.entries(want)) {
    assert.deepEqual(d[k as keyof ContactDraft], v, `${k}: got ${JSON.stringify(d[k as keyof ContactDraft])}`);
  }
}

test("Austrian signature with academic titles", async () => {
  const d = await draft(
    `Mit freundlichen Grüßen

Mag. Anna Huber, MBA
Geschäftsführerin
Huber & Partner Consulting GmbH
Mariahilfer Straße 123, 1060 Wien
T: +43 1 234 56 78
M: +43 664 123 45 67
anna.huber@huber-partner.at
www.huber-partner.at`,
  );
  expectFields(d, {
    namePrefix: "Mag.",
    givenName: "Anna",
    familyName: "Huber",
    nameSuffix: "MBA",
    jobTitle: "Geschäftsführerin",
    organization: "Huber & Partner Consulting GmbH",
  });
  assert.deepEqual(d.emails, [{ value: "anna.huber@huber-partner.at", label: "work" }]);
  assert.deepEqual(
    d.phones.map((p) => p.label),
    ["work", "mobile"],
  );
  assert.equal(d.address?.postalCode, "1060");
  assert.equal(d.address?.city, "Wien");
  assert.equal(d.urls[0]?.value, "www.huber-partner.at");
});

test("one-line pipe signature", async () => {
  const d = await draft(
    "Thomas Berger | Head of Sales | Alpenblick Software AG | +43 676 9876543 | t.berger@alpenblick.at",
  );
  expectFields(d, {
    givenName: "Thomas",
    familyName: "Berger",
    jobTitle: "Head of Sales",
    organization: "Alpenblick Software AG",
  });
  assert.equal(d.phones[0]?.label, "mobile");
});

test("English card, title 'at' company, US phone", async () => {
  const d = await draft(
    `Sarah O'Connor
VP Marketing at Brightline
sarah@brightline.io
+1 (415) 555-0132
brightline.io`,
  );
  expectFields(d, {
    givenName: "Sarah",
    familyName: "O'Connor",
    jobTitle: "VP Marketing",
    organization: "Brightline",
  });
});

test("LinkedIn profile OCR noise", async () => {
  const d = await draft(
    `Markus Leitner · 2nd
Co-Founder & CEO bei Datenwerk
Wien, Österreich · Kontaktinfo
500+ Kontakte
Nachricht
Folgen`,
  );
  expectFields(d, {
    givenName: "Markus",
    familyName: "Leitner",
    jobTitle: "Co-Founder & CEO",
    organization: "Datenwerk",
  });
});

test("generic office email does not become the name; German address, Fax", async () => {
  const d = await draft(
    `Dr. Stefan von der Heide
Rechtsanwalt
Kanzlei von der Heide
Königsallee 12
40212 Düsseldorf
Tel. 0211 123456
Fax 0211 123457
office@heide-recht.de`,
  );
  expectFields(d, {
    namePrefix: "Dr.",
    givenName: "Stefan",
    familyName: "von der Heide",
    jobTitle: "Rechtsanwalt",
  });
  assert.deepEqual(
    d.phones.map((p) => p.label),
    ["work", "fax"],
  );
  assert.equal(d.address?.city, "Düsseldorf");
});

test("freemail: no company guessed from gmail", async () => {
  const d = await draft("Lena Gruber\nlena.gruber@gmail.com\n0664 1112233");
  expectFields(d, {
    givenName: "Lena",
    familyName: "Gruber",
    organization: "",
  });
  assert.equal(d.phones[0]?.label, "mobile");
});

test("middle initial survives, labels on their own lines are dropped", async () => {
  const d = await draft("Anna M. Huber\nTel.\n+43 1 555 1234\nE-Mail:\nanna@huber.at");
  expectFields(d, { givenName: "Anna M.", familyName: "Huber" });
});

test("screenshot: OCR of a rendered business card", async () => {
  const text = ocr(path.join(__dirname, "fixtures", "card.png"));
  const d = await draft(text);
  expectFields(d, {
    namePrefix: "DI",
    givenName: "Julia",
    familyName: "Steiner",
    nameSuffix: "MSc",
    jobTitle: "Leiterin Digitalisierung",
    organization: "Donauwerk Energie GmbH",
  });
  assert.deepEqual(
    d.phones.map((p) => p.label),
    ["work", "mobile"],
  );
  assert.equal(d.emails[0]?.value, "julia.steiner@donauwerk.at");
  assert.equal(d.address?.postalCode, "1220");
  assert.deepEqual(d.urls, [{ value: "donauwerk.at", label: "work" }]);
});

test("portrait photo with EXIF rotation is read upright", async () => {
  const text = ocr(path.join(__dirname, "fixtures", "card-exif-rotated.jpg"));
  const d = await draft(text);
  assert.equal(d.givenName, "Julia");
  assert.equal(d.organization, "Donauwerk Energie GmbH");
});
