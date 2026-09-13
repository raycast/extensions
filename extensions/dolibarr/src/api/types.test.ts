import { describe, expect, it } from "vitest";
import {
  daysOverdue,
  toContact,
  toContactDetail,
  toInvoice,
  toOrder,
  toProposal,
  toThirdparty,
  toThirdpartyDetail,
} from "./types";

describe("toThirdparty", () => {
  it("converts string IDs to numbers", () => {
    expect(toThirdparty({ id: "323", name: "Müller GmbH", client: "1" }).id).toBe(323);
  });

  it("turns empty text fields into null", () => {
    const tp = toThirdparty({ id: "1", name: "A", client: "0", name_alias: "", email: "" });
    expect(tp.nameAlias).toBeNull();
    expect(tp.email).toBeNull();
  });

  it("maps the client code to the relation", () => {
    expect(toThirdparty({ id: "1", name: "A", client: "1" }).relation).toBe("customer");
    expect(toThirdparty({ id: "1", name: "A", client: "2" }).relation).toBe("prospect");
    expect(toThirdparty({ id: "1", name: "A", client: "3" }).relation).toBe("both");
    expect(toThirdparty({ id: "1", name: "A", client: "0" }).relation).toBe("none");
  });
});

describe("toContact", () => {
  it("carries the company link over as a number", () => {
    expect(toContact({ id: "2", lastname: "Bärlach", socid: "373" }).thirdpartyId).toBe(373);
  });

  it("tolerates a contact without a company", () => {
    expect(toContact({ id: "2", lastname: "Ohnefirma", socid: "" }).thirdpartyId).toBeNull();
  });
});

describe("toProposal", () => {
  const raw = {
    id: "94",
    ref: "A202608-0092",
    socid: "775",
    status: 1,
    total_ht: "5220.00000000",
    total_ttc: "6211.80000000",
    date: 1786053600,
  };

  it("converts amounts to numbers", () => {
    expect(toProposal(raw).totalHt).toBe(5220);
    expect(toProposal(raw).totalTtc).toBe(6211.8);
  });

  it("converts the unix timestamp to a date", () => {
    expect(toProposal(raw).date?.getTime()).toBe(1786053600 * 1000);
  });

  it("labels the proposal statuses", () => {
    const label = (status: number) => toProposal({ ...raw, status }).status.label;
    expect(label(0)).toBe("Draft");
    expect(label(1)).toBe("Open");
    expect(label(2)).toBe("Signed");
    expect(label(3)).toBe("Declined");
    expect(label(4)).toBe("Billed");
  });

  it("tolerates a missing date", () => {
    expect(toProposal({ ...raw, date: 0 }).date).toBeNull();
  });
});

describe("toInvoice", () => {
  const raw = {
    id: "5",
    ref: "FA2507-0113",
    socid: "775",
    status: 1,
    total_ht: "100.00000000",
    total_ttc: "119.00000000",
    date: 1786053600,
  };
  const today = new Date("2026-08-07T12:00:00Z");

  it("labels the invoice statuses", () => {
    const label = (status: number) => toInvoice({ ...raw, status }, today).status.label;
    expect(label(0)).toBe("Draft");
    expect(label(1)).toBe("Unpaid");
    expect(label(2)).toBe("Paid");
    expect(label(3)).toBe("Cancelled");
  });

  it("marks an unpaid invoice past its deadline as overdue", () => {
    const overdue = toInvoice({ ...raw, status: 1, date_lim_reglement: 1785000000 }, today);
    expect(overdue.status.label).toBe("Overdue");
    expect(overdue.status.tone).toBe("negative");
  });

  it("does not mark a paid invoice past its deadline as overdue", () => {
    expect(toInvoice({ ...raw, status: 2, date_lim_reglement: 1785000000 }, today).status.label).toBe("Paid");
  });

  it("does not mark an unpaid invoice with a future deadline as overdue", () => {
    expect(toInvoice({ ...raw, status: 1, date_lim_reglement: 1790000000 }, today).status.label).toBe("Unpaid");
  });
});

describe("statusCode and dueDate", () => {
  const invoice = {
    id: "5",
    ref: "FA-1",
    socid: "775",
    status: 1,
    total_ht: "100",
    total_ttc: "119",
    date: 1786053600,
    date_lim_reglement: 1785000000,
  };
  const today = new Date("2026-08-07T12:00:00Z");

  it("passes the raw status code through", () => {
    expect(toInvoice(invoice, today).statusCode).toBe(1);
    expect(toInvoice({ ...invoice, status: 2 }, today).statusCode).toBe(2);
  });

  it("carries the payment deadline over as a date", () => {
    expect(toInvoice(invoice, today).dueDate?.getTime()).toBe(1785000000 * 1000);
  });

  it("leaves the deadline empty when none is set", () => {
    expect(toInvoice({ ...invoice, date_lim_reglement: 0 }, today).dueDate).toBeNull();
  });

  it("flags overdue only for unpaid invoices", () => {
    expect(toInvoice(invoice, today).isOverdue).toBe(true);
    expect(toInvoice({ ...invoice, status: 2 }, today).isOverdue).toBe(false);
  });

  it("has neither deadline nor overdue flag on proposals", () => {
    const proposal = toProposal({ id: "1", ref: "A-1", socid: "1", status: 1, date: 1786053600 });
    expect(proposal.dueDate).toBeNull();
    expect(proposal.isOverdue).toBe(false);
    expect(proposal.statusCode).toBe(1);
  });
});

describe("daysOverdue", () => {
  const today = new Date("2026-08-07T12:00:00Z");

  it("counts whole days since the deadline", () => {
    expect(daysOverdue(new Date("2026-08-06T12:00:00Z"), today)).toBe(1);
    expect(daysOverdue(new Date("2026-07-08T12:00:00Z"), today)).toBe(30);
  });

  it("rounds partial days down", () => {
    expect(daysOverdue(new Date("2026-08-06T20:00:00Z"), today)).toBe(0);
  });

  it("returns zero for a future deadline", () => {
    expect(daysOverdue(new Date("2026-09-01T12:00:00Z"), today)).toBe(0);
  });

  it("returns zero without a deadline", () => {
    expect(daysOverdue(null, today)).toBe(0);
  });
});

describe("currency", () => {
  const today = new Date("2026-08-07T12:00:00Z");
  const base = {
    id: "5",
    ref: "FA-1",
    socid: "775",
    status: 1,
    total_ht: "100",
    total_ttc: "119",
    date: 1786053600,
  };

  it("takes the currency from the document", () => {
    expect(toInvoice({ ...base, multicurrency_code: "CHF" }, today).currency).toBe("CHF");
  });

  it("falls back to EUR when the field is missing", () => {
    expect(toInvoice(base, today).currency).toBe("EUR");
  });

  it("reports the instance amounts when no foreign currency is used", () => {
    const invoice = toInvoice(
      { ...base, fk_multicurrency: "0", multicurrency_code: "EUR", multicurrency_total_ttc: "999" },
      today,
    );
    expect(invoice.totalTtc).toBe(119);
  });

  it("pairs the foreign amount with the foreign currency", () => {
    // Otherwise a CHF label would sit next to a euro amount.
    const invoice = toInvoice(
      {
        ...base,
        fk_multicurrency: "2",
        multicurrency_code: "CHF",
        multicurrency_total_ht: "95",
        multicurrency_total_ttc: "113",
      },
      today,
    );
    expect(invoice.currency).toBe("CHF");
    expect(invoice.totalHt).toBe(95);
    expect(invoice.totalTtc).toBe(113);
  });

  it("applies the same rule to proposals", () => {
    expect(toProposal({ ...base, multicurrency_code: "USD" }).currency).toBe("USD");
  });
});

describe("proposal validity", () => {
  const today = new Date("2026-08-08T12:00:00Z");
  const proposal = {
    id: "1",
    ref: "A-1",
    socid: "7",
    status: 1,
    total_ht: "100",
    total_ttc: "119",
    date: 1786053600,
    duree_validite: 15,
  };
  const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

  it("carries the validity deadline over as a date", () => {
    const result = toProposal({ ...proposal, fin_validite: seconds("2026-08-22T00:00:00Z") }, today);
    expect(result.validUntil?.toISOString().slice(0, 10)).toBe("2026-08-22");
  });

  it("marks an open proposal past its deadline as expired", () => {
    const result = toProposal({ ...proposal, fin_validite: seconds("2026-06-21T00:00:00Z") }, today);
    expect(result.isExpired).toBe(true);
    expect(result.status.label).toBe("Expired");
    expect(result.status.tone).toBe("warning");
  });

  it("leaves a proposal within its deadline open", () => {
    const result = toProposal({ ...proposal, fin_validite: seconds("2026-08-22T00:00:00Z") }, today);
    expect(result.isExpired).toBe(false);
    expect(result.status.label).toBe("Open");
  });

  it("does not expire a signed proposal — signing outlives the deadline", () => {
    const result = toProposal({ ...proposal, status: 2, fin_validite: seconds("2026-06-21T00:00:00Z") }, today);
    expect(result.isExpired).toBe(false);
    expect(result.status.label).toBe("Signed");
  });

  it("does not expire a draft", () => {
    const result = toProposal({ ...proposal, status: 0, fin_validite: seconds("2026-06-21T00:00:00Z") }, today);
    expect(result.isExpired).toBe(false);
    expect(result.status.label).toBe("Draft");
  });

  it("tolerates a proposal without a deadline", () => {
    const result = toProposal(proposal, today);
    expect(result.validUntil).toBeNull();
    expect(result.isExpired).toBe(false);
  });

  it("has no validity on invoices", () => {
    const invoice = toInvoice({ ...proposal, fin_validite: seconds("2026-06-21T00:00:00Z") }, today);
    expect(invoice.validUntil).toBeNull();
    expect(invoice.isExpired).toBe(false);
  });

  it("is not tripped up by being passed straight to map()", () => {
    // rows.map(toProposal) would hand the array index in as `today` — that is 1970.
    const rows = [
      { ...proposal, fin_validite: seconds("2099-01-01T00:00:00Z") },
      { ...proposal, fin_validite: seconds("2099-01-01T00:00:00Z") },
    ];
    const results = rows.map((row) => toProposal(row, today));
    expect(results.every((r) => r.isExpired === false)).toBe(true);
  });
});

describe("toThirdpartyDetail", () => {
  const raw = {
    id: "323",
    name: "Nordwind Systems GmbH",
    address: "Beispielweg 12",
    zip: "12345",
    town: "Musterstadt",
    url: "https://www.example.org/impressum/",
    tva_intra: "DE123456789",
    idprof1: "",
    idprof2: "Musterstadt",
    idprof3: "HRB 12345",
    forme_juridique: "GmbH - Gesellschaft mit beschränkter Haftung",
    price_level: 1,
    code_client: "D010012",
    note_public: null,
    note_private: "Rahmenvertrag bis Jahresende",
  };

  it("maps the German commercial register fields", () => {
    const detail = toThirdpartyDetail(raw);
    expect(detail.registerCourt).toBe("Musterstadt");
    expect(detail.registerNumber).toBe("HRB 12345");
    expect(detail.vatNumber).toBe("DE123456789");
  });

  it("keeps both notes apart", () => {
    const detail = toThirdpartyDetail(raw);
    expect(detail.notePrivate).toBe("Rahmenvertrag bis Jahresende");
    expect(detail.notePublic).toBeNull();
  });

  it("turns empty strings into null", () => {
    expect(toThirdpartyDetail({ ...raw, address: "" }).address).toBeNull();
    expect(toThirdpartyDetail({ ...raw, tva_intra: "" }).vatNumber).toBeNull();
  });

  it("reads the price level as a number", () => {
    expect(toThirdpartyDetail(raw).priceLevel).toBe(1);
    expect(toThirdpartyDetail({ ...raw, price_level: "2" }).priceLevel).toBe(2);
  });
});

describe("toContactDetail", () => {
  const raw = {
    id: "2",
    lastname: "Bärlach",
    firstname: "Jonas",
    civility_code: "MR",
    poste: "Geschäftsführer",
    email: "j.baerlach@suedlicht.example",
    phone_pro: "+4940432180",
    phone_mobile: "",
    socid: "373",
    socname: "Südlicht AG",
    socialnetworks: [],
    array_options: { options_abteilung: null, options_informal: null },
    note_public: "",
    note_private: "",
  };

  it("maps names, position and company", () => {
    const detail = toContactDetail(raw);
    expect(detail.lastname).toBe("Bärlach");
    expect(detail.position).toBe("Geschäftsführer");
    expect(detail.companyName).toBe("Südlicht AG");
    expect(detail.thirdpartyId).toBe(373);
  });

  it("treats an empty socialnetworks array as absent", () => {
    // Dolibarr sends [] when nothing is maintained and an object otherwise.
    expect(toContactDetail(raw).socialNetworks).toBeNull();
  });

  it("reads social networks when they are present", () => {
    const detail = toContactDetail({ ...raw, socialnetworks: { linkedin: "in/falk" } });
    expect(detail.socialNetworks).toEqual({ linkedin: "in/falk" });
  });

  it("reads the department out of array_options", () => {
    const detail = toContactDetail({ ...raw, array_options: { options_abteilung: "Einkauf" } });
    expect(detail.department).toBe("Einkauf");
  });

  it("tolerates a null department", () => {
    expect(toContactDetail(raw).department).toBeNull();
  });

  it("tolerates missing array_options entirely", () => {
    const withoutOptions: Record<string, unknown> = { ...raw };
    delete withoutOptions.array_options;
    expect(toContactDetail(withoutOptions).department).toBeNull();
  });

  it("turns empty phone and note fields into null", () => {
    const detail = toContactDetail(raw);
    expect(detail.phoneMobile).toBeNull();
    expect(detail.notePrivate).toBeNull();
  });
});

describe("toOrder", () => {
  const raw = {
    id: "23",
    ref: "AB202608-0020",
    socid: "774",
    status: 1,
    billed: "0",
    total_ht: "270.00000000",
    total_ttc: "321.30000000",
    date: 1786053600,
  };

  it("labels the order statuses", () => {
    // billed: "1" isolates the plain status mapping — otherwise status 3 turns into "To bill".
    const label = (status: number) => toOrder({ ...raw, status, billed: "1" }).status.label;
    expect(label(0)).toBe("Draft");
    expect(label(1)).toBe("Open");
    expect(label(2)).toBe("In progress");
    expect(label(3)).toBe("Delivered");
    expect(label(-1)).toBe("Cancelled");
  });

  it("marks a delivered order without an invoice as to bill", () => {
    const order = toOrder({ ...raw, status: 3, billed: "0" });
    expect(order.isUnbilled).toBe(true);
    expect(order.status.label).toBe("To bill");
    expect(order.status.tone).toBe("warning");
  });

  it("leaves a delivered and billed order alone", () => {
    const order = toOrder({ ...raw, status: 3, billed: "1" });
    expect(order.isUnbilled).toBe(false);
    expect(order.status.label).toBe("Delivered");
  });

  it("does not call an open order unbilled — billing it would be premature", () => {
    const order = toOrder({ ...raw, status: 1, billed: "0" });
    expect(order.isUnbilled).toBe(false);
    expect(order.status.label).toBe("Open");
  });

  it("does not call a draft unbilled", () => {
    expect(toOrder({ ...raw, status: 0, billed: "0" }).isUnbilled).toBe(false);
  });

  it("carries the kind and the amounts", () => {
    const order = toOrder(raw);
    expect(order.kind).toBe("order");
    expect(order.totalTtc).toBe(321.3);
    expect(order.currency).toBe("EUR");
  });

  it("has no payment or validity deadline", () => {
    const order = toOrder(raw);
    expect(order.dueDate).toBeNull();
    expect(order.isOverdue).toBe(false);
    expect(order.validUntil).toBeNull();
    expect(order.isExpired).toBe(false);
  });
});

describe("flags stay bound to their document kind", () => {
  const plain = { id: "1", ref: "X-1", socid: "7", status: 1, total_ht: "1", total_ttc: "1", date: 1786053600 };

  it("never marks a proposal or an invoice as unbilled", () => {
    expect(toProposal(plain).isUnbilled).toBe(false);
    expect(toInvoice(plain).isUnbilled).toBe(false);
  });
});
