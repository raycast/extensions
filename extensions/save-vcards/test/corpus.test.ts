// Corpus of realistic (invented) signatures, threads and profiles. Each case states only the
// fields it is about. A per-field accuracy table is printed so regressions are visible.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  normalizePhone,
  selectSignatureBlock,
  type ContactDraft,
} from "../src/core/parse";
import { draft, vcard } from "./support";

type Want = Partial<{
  namePrefix: string;
  givenName: string;
  familyName: string;
  nameSuffix: string;
  organization: string;
  jobTitle: string;
  emails: string[];
  phones: string[]; // "label value"
  urls: string[];
  city: string;
  postalCode: string;
  street: string;
}>;

const CASES: { name: string; text: string; want: Want }[] = [
  {
    name: "AT Outlook signature with disclaimer",
    text: `Liebe Grüße
Katharina Moser
Senior Account Managerin

Moser & Kern Werbeagentur GmbH
Lindengasse 42/3, 1070 Wien
Tel: +43 1 523 44 10-22
Mobil: +43 660 123 4567
k.moser@moserkern.at | www.moserkern.at

FN 123456a | Handelsgericht Wien | UID ATU12345678
Diese E-Mail kann vertrauliche Informationen enthalten.`,
    want: {
      givenName: "Katharina",
      familyName: "Moser",
      jobTitle: "Senior Account Managerin",
      organization: "Moser & Kern Werbeagentur GmbH",
      phones: ["work +43 1 523 44 10-22", "mobile +43 660 123 4567"],
      emails: ["k.moser@moserkern.at"],
      city: "Wien",
      postalCode: "1070",
    },
  },
  {
    name: "AT national numbers become international",
    text: `Ing. Peter Wallner
Bauleiter
Wallner Bau GmbH
4020 Linz, Hauptplatz 5
Tel. 0732 77 88 99
Handy 0676 555 12 34
peter.wallner@wallnerbau.at`,
    want: {
      namePrefix: "Ing.",
      givenName: "Peter",
      familyName: "Wallner",
      jobTitle: "Bauleiter",
      organization: "Wallner Bau GmbH",
      phones: ["work +43 732 77 88 99", "mobile +43 676 555 12 34"],
      city: "Linz",
    },
  },
  {
    name: "DE signature, Geschäftsführer, 0049",
    text: `Beste Grüße aus München

Dr. Florian Becker
Geschäftsführer
Becker Analytics GmbH
Leopoldstraße 88
80802 München
T 0049 89 1234567
florian.becker@becker-analytics.de
https://becker-analytics.de`,
    want: {
      namePrefix: "Dr.",
      givenName: "Florian",
      familyName: "Becker",
      jobTitle: "Geschäftsführer",
      organization: "Becker Analytics GmbH",
      phones: ["work +49 89 1234567"],
      urls: ["https://becker-analytics.de"],
      postalCode: "80802",
      city: "München",
    },
  },
  {
    name: "CH signature with AG and +41 mobile",
    text: `Freundliche Grüsse
Nina Brunner
Head of Partnerships
Helvetic Data AG
Bahnhofstrasse 10, 8001 Zürich
+41 44 123 45 67
+41 79 765 43 21
nina.brunner@helveticdata.ch`,
    want: {
      givenName: "Nina",
      familyName: "Brunner",
      jobTitle: "Head of Partnerships",
      organization: "Helvetic Data AG",
      phones: ["work +41 44 123 45 67", "mobile +41 79 765 43 21"],
      city: "Zürich",
    },
  },
  {
    name: "UK signature, Ltd, title on same line as company",
    text: `Kind regards,
James Whitfield
Director, Northbank Consulting Ltd
+44 20 7946 0123
james@northbank.co.uk`,
    want: {
      givenName: "James",
      familyName: "Whitfield",
      jobTitle: "Director",
      organization: "Northbank Consulting Ltd",
      emails: ["james@northbank.co.uk"],
    },
  },
  {
    name: "US card with Inc. and middle initial",
    text: `Robert J. Alvarez
Chief Technology Officer
Clearpath Robotics Inc.
1200 Market St, San Francisco, CA 94103
(415) 555-0199
ralvarez@clearpathrobotics.com`,
    want: {
      givenName: "Robert J.",
      familyName: "Alvarez",
      jobTitle: "Chief Technology Officer",
      organization: "Clearpath Robotics Inc.",
      emails: ["ralvarez@clearpathrobotics.com"],
    },
  },
  {
    name: "thread: newest signature wins, quoted header ignored",
    text: `Hallo Julian,

danke für das Gespräch gestern. Anbei wie besprochen die Unterlagen.
Lass uns nächste Woche telefonieren, Dienstag oder Mittwoch passt mir gut.
Ich bringe auch die Zahlen aus dem letzten Quartal mit.

Beste Grüße
Michael Resch
General Manager
BIMEXPERTS GmbH
M +43 664 222 33 44
michael.resch@bimexperts.com

Von: Christian Daimer <c.daimer@loboscapital.cc>
Gesendet: Dienstag, 10. November 2026 12:29
An: Michael Resch <michael.resch@bimexperts.com>
Betreff: Intro

Hi Michael, darf ich vorstellen …
Christian Daimer
Lobos Capital
+43 699 111 22 33`,
    want: {
      givenName: "Michael",
      familyName: "Resch",
      jobTitle: "General Manager",
      organization: "BIMEXPERTS GmbH",
      emails: ["michael.resch@bimexperts.com"],
      phones: ["mobile +43 664 222 33 44"],
    },
  },
  {
    name: "LinkedIn profile screenshot (OCR text)",
    text: `Sophie Lehner (She/Her) · 1st
Founder & CEO at Grünwerk | Climate Tech | Speaker
Vienna, Austria · Contact info
Grünwerk
Wirtschaftsuniversität Wien
500+ connections
Message
More`,
    want: {
      givenName: "Sophie",
      familyName: "Lehner",
      jobTitle: "Founder & CEO",
      organization: "Grünwerk",
    },
  },
  {
    name: "LinkedIn German UI",
    text: `David Novak · 2.
Head of Engineering bei Tractive
Linz, Oberösterreich, Österreich · Kontaktinfo
Tractive
Johannes Kepler Universität Linz
Nachricht
Mehr`,
    want: {
      givenName: "David",
      familyName: "Novak",
      jobTitle: "Head of Engineering",
      organization: "Tractive",
    },
  },
  {
    name: "one-line signature with pipes and labels",
    text: "Laura Fink | Marketing Manager | Fink Media OG | T +43 316 123456 | E laura@finkmedia.at",
    want: {
      givenName: "Laura",
      familyName: "Fink",
      jobTitle: "Marketing Manager",
      organization: "Fink Media OG",
      phones: ["work +43 316 123456"],
      emails: ["laura@finkmedia.at"],
    },
  },
  {
    name: "surname first with comma",
    text: `Gruber, Thomas
Prokurist
Alpenland Versicherungsmakler GmbH
thomas.gruber@alpenland-vm.at
+43 512 34 56 78`,
    want: {
      givenName: "Thomas",
      familyName: "Gruber",
      jobTitle: "Prokurist",
      organization: "Alpenland Versicherungsmakler GmbH",
    },
  },
  {
    name: "double post-nominals and Mag.a",
    text: `Mag.a Eva Steindl, BSc MSc
Steuerberaterin
Steindl Steuerberatung e.U.
eva.steindl@steindl-stb.at
0664 300 40 50`,
    want: {
      namePrefix: "Mag.a",
      givenName: "Eva",
      familyName: "Steindl",
      nameSuffix: "BSc, MSc",
      jobTitle: "Steuerberaterin",
      organization: "Steindl Steuerberatung e.U.",
      phones: ["mobile +43 664 300 40 50"],
    },
  },
  {
    name: "company without legal form, from email domain",
    text: `Jonas Weber
Product Lead
jonas@lumora.io
+49 151 23456789`,
    want: {
      givenName: "Jonas",
      familyName: "Weber",
      jobTitle: "Product Lead",
      organization: "Lumora",
      phones: ["mobile +49 151 23456789"],
    },
  },
  {
    name: "generic info@ address keeps the person's name",
    text: `Andrea Pichler
Inhaberin
Blumen Pichler
Hauptstraße 3, 2340 Mödling
02236 12345
info@blumen-pichler.at`,
    want: {
      givenName: "Andrea",
      familyName: "Pichler",
      jobTitle: "Inhaberin",
      phones: ["work +43 2236 12345"],
      postalCode: "2340",
    },
  },
  {
    name: "fax and switchboard numbers",
    text: `Mag. Bernhard Koller
Rechtsanwalt
Koller Rechtsanwälte GmbH
Schottenring 14, 1010 Wien
T +43 1 532 10 10
F +43 1 532 10 10 99
koller@koller-law.at`,
    want: {
      namePrefix: "Mag.",
      givenName: "Bernhard",
      familyName: "Koller",
      jobTitle: "Rechtsanwalt",
      phones: ["work +43 1 532 10 10", "fax +43 1 532 10 10 99"],
    },
  },
  {
    name: "LinkedIn URL kept as LinkedIn",
    text: `Tobias Hartl
Sales Director DACH
Nordlicht Software GmbH
tobias.hartl@nordlicht.de
linkedin.com/in/tobiashartl`,
    want: {
      givenName: "Tobias",
      familyName: "Hartl",
      urls: ["linkedin.com/in/tobiashartl"],
    },
  },
  {
    name: "surname particle",
    text: `Charlotte van der Berg
Partner
van der Berg & Co.
charlotte@vdberg.nl
+31 20 123 4567`,
    want: {
      givenName: "Charlotte",
      familyName: "van der Berg",
      jobTitle: "Partner",
    },
  },
];

const stats: Record<string, { ok: number; total: number }> = {};
function check(field: string, got: unknown, want: unknown, failures: string[]) {
  stats[field] ??= { ok: 0, total: 0 };
  stats[field].total++;
  try {
    assert.deepEqual(got, want);
    stats[field].ok++;
  } catch {
    failures.push(
      `${field}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
    );
  }
}

function project(d: ContactDraft, field: keyof Want): unknown {
  switch (field) {
    case "emails":
      return d.emails.map((e) => e.value);
    case "phones":
      return d.phones.map((p) => `${p.label} ${p.value}`);
    case "urls":
      return d.urls.map((u) => u.value);
    case "city":
    case "postalCode":
    case "street":
      return d.address?.[field] ?? "";
    default:
      return d[field as keyof ContactDraft];
  }
}

for (const c of CASES) {
  test(c.name, () => {
    const d = draft(c.text);
    const failures: string[] = [];
    for (const [field, want] of Object.entries(c.want))
      check(field, project(d, field as keyof Want), want, failures);
    assert.equal(failures.length, 0, failures.join("\n"));
  });
}

after(() => {
  const rows = Object.entries(stats).map(
    ([f, s]) => `${f.padEnd(13)} ${s.ok}/${s.total}`,
  );
  console.log("\nfield accuracy\n" + rows.join("\n"));
});

test("normalizePhone", () => {
  assert.equal(normalizePhone("0664 123 45 67", "43"), "+43 664 123 45 67");
  assert.equal(normalizePhone("0043 1 234 56", "43"), "+43 1 234 56");
  assert.equal(normalizePhone("+43 (0) 1 234 56", "43"), "+43 1 234 56");
  assert.equal(normalizePhone("0732/77 88 99", "43"), "+43 732 77 88 99");
  assert.equal(normalizePhone("(415) 555-0199", "43"), "(415) 555-0199");
  assert.equal(normalizePhone("0664 123 45 67", ""), "0664 123 45 67");
  assert.equal(normalizePhone("089 1234567", "49"), "+49 89 1234567");
});

test("short text is not cut down", () => {
  const t = "Anna Huber\nanna@huber.at";
  assert.equal(selectSignatureBlock(t), t);
});

test("vCard output", () => {
  const card = vcard({
    namePrefix: "Mag.",
    givenName: "Anna",
    familyName: "Huber",
    nameSuffix: "MBA",
    organization: "Huber GmbH",
    jobTitle: "CEO",
    emails: [{ value: "anna@huber.at", label: "work" }],
    phones: [{ value: "+43 664 1234567", label: "mobile" }],
    urls: [],
    address: {
      street: "Mariahilfer Straße 1",
      postalCode: "1060",
      city: "Wien",
      country: "Österreich",
    },
    note: "Met at Pioneers",
  });
  assert.match(card, /BEGIN:VCARD/);
  assert.match(card, /N:Huber;Anna;;Mag\.;MBA/);
  assert.match(card, /ORG:Huber GmbH/);
  assert.match(card, /TEL;type=CELL.*:\+43 664 1234567/i);
  assert.match(card, /Mariahilfer Straße 1;Wien;;1060;Österreich/);
  assert.match(card, /NOTE:Met at Pioneers/);
});

// ---- regressions from the code review ----

test("street-only address keeps name and title", () => {
  const d = draft("Anna Huber\nGeschäftsführerin\nMusterweg 12\nanna@huber.at");
  assert.equal(d.givenName, "Anna");
  assert.equal(d.familyName, "Huber");
  assert.equal(d.jobTitle, "Geschäftsführerin");
});

test("CRLF text keeps phone labels", () => {
  const d = draft(
    "Anna Huber\r\nT: +43 1 234 56 78\r\nF: +43 1 234 56 79\r\nanna@huber.at",
  );
  assert.deepEqual(
    d.phones.map((p) => p.label),
    ["work", "fax"],
  );
});

test("long unbroken token parses fast", () => {
  const started = Date.now();
  draft(
    "Anna Huber\nanna@huber.at\n" +
      "a.".repeat(40000) +
      "\n" +
      "-".repeat(20000),
  );
  assert.ok(Date.now() - started < 1500, `took ${Date.now() - started} ms`);
});

test("same number written two ways appears once", () => {
  const d = draft(
    "Anna Huber\nT 0664 1234567\nM +43 664 1234567\nanna@huber.at",
  );
  assert.equal(d.phones.length, 1);
});

test("Italy keeps the trunk zero, parenthesised area codes normalise", () => {
  assert.equal(normalizePhone("06 1234 5678", "39"), "+39 06 1234 5678");
  assert.equal(normalizePhone("(0664) 123 4567", "43"), "+43 664 123 4567");
});

test("company with 'Partner' and a legal form is the company, not the job title", () => {
  const d = draft(
    "Beste Grüße\n\nMag. Anna Huber, MBA\nGeschäftsführerin\nHuber & Partner Consulting GmbH\nMariahilfer Straße 123, 1060 Wien\nT: +43 1 234 56 78\nM: +43 664 123 45 67\nanna.huber@huber-partner.at\nwww.huber-partner.at",
  );
  assert.equal(d.jobTitle, "Geschäftsführerin");
  assert.equal(d.organization, "Huber & Partner Consulting GmbH");
});

test("'<role> at <company with Partner>' still splits", () => {
  const d = draft(
    "Lukas Brandl\nCEO at Brandl & Partner GmbH\nlukas@brandl-partner.at",
  );
  assert.equal(d.jobTitle, "CEO");
  assert.equal(d.organization, "Brandl & Partner GmbH");
});

test("unrecognized title line does not swallow the company", () => {
  // A title the keyword list does not know, directly under the name.
  const d = draft(
    "Anna Huber\nKuratorin\nHuber & Partner Consulting GmbH\nanna@huber-partner.at",
  );
  assert.equal(d.jobTitle, "Kuratorin");
  assert.equal(d.organization, "Huber & Partner Consulting GmbH");
});
