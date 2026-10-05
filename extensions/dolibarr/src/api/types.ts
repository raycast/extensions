export type Relation = "customer" | "prospect" | "both" | "none";

export type Thirdparty = {
  id: number;
  name: string;
  nameAlias: string | null;
  email: string | null;
  phone: string | null;
  customerCode: string | null;
  relation: Relation;
};

export type Contact = {
  id: number;
  firstname: string | null;
  lastname: string;
  email: string | null;
  phonePro: string | null;
  phoneMobile: string | null;
  position: string | null;
  thirdpartyId: number | null;
};

export type DocumentKind = "proposal" | "invoice" | "order";

/** Dolibarr's internal module name for a document kind, used by document.php and /documents/*. */
export const MODULE_PART: Record<DocumentKind, string> = {
  proposal: "propal",
  invoice: "facture",
  order: "commande",
};

export type DocumentStatus = {
  label: string;
  tone: "neutral" | "open" | "positive" | "negative" | "warning";
};

export type DocumentSummary = {
  id: number;
  kind: DocumentKind;
  ref: string;
  thirdpartyId: number;
  date: Date | null;
  /** Raw Dolibarr status code — the reliable basis for logic, unlike the German label. */
  statusCode: number;
  /** Payment deadline; always null for proposals. */
  dueDate: Date | null;
  isOverdue: boolean;
  /** Validity deadline of a proposal; always null for invoices. */
  validUntil: Date | null;
  isExpired: boolean;
  /** Order delivered but not yet invoiced; always false for proposals and invoices. */
  isUnbilled: boolean;
  totalHt: number;
  totalTtc: number;
  /** Currency the amounts above are denominated in — never assume EUR. */
  currency: string;
  status: DocumentStatus;
};

export type RawThirdparty = Record<string, unknown>;
export type RawContact = Record<string, unknown>;
export type RawDocument = Record<string, unknown>;

/** Dolibarr sends numbers as strings; empty text fields arrive as "" rather than null. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNum(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
}

/** Dolibarr uses 0 to mean "no date", which would otherwise become 1970. */
function timestamp(value: unknown): Date | null {
  const seconds = optionalNum(value);
  return seconds === null ? null : new Date(seconds * 1000);
}

function toRelation(client: unknown): Relation {
  switch (String(client)) {
    case "1":
      return "customer";
    case "2":
      return "prospect";
    case "3":
      return "both";
    default:
      return "none";
  }
}

export function toThirdparty(raw: RawThirdparty): Thirdparty {
  return {
    id: num(raw.id),
    name: text(raw.name) ?? "(unnamed)",
    nameAlias: text(raw.name_alias),
    email: text(raw.email),
    phone: text(raw.phone),
    customerCode: text(raw.code_client),
    relation: toRelation(raw.client),
  };
}

export function toContact(raw: RawContact): Contact {
  return {
    id: num(raw.id),
    firstname: text(raw.firstname),
    lastname: text(raw.lastname) ?? "(unnamed)",
    email: text(raw.email),
    phonePro: text(raw.phone_pro),
    phoneMobile: text(raw.phone_mobile),
    position: text(raw.poste),
    thirdpartyId: optionalNum(raw.socid),
  };
}

const PROPOSAL_STATUS: Record<number, DocumentStatus> = {
  0: { label: "Draft", tone: "neutral" },
  1: { label: "Open", tone: "open" },
  2: { label: "Signed", tone: "positive" },
  3: { label: "Declined", tone: "negative" },
  4: { label: "Billed", tone: "neutral" },
};

const INVOICE_STATUS: Record<number, DocumentStatus> = {
  0: { label: "Draft", tone: "neutral" },
  1: { label: "Unpaid", tone: "open" },
  2: { label: "Paid", tone: "positive" },
  3: { label: "Cancelled", tone: "neutral" },
};

const ORDER_STATUS: Record<number, DocumentStatus> = {
  [-1]: { label: "Cancelled", tone: "neutral" },
  0: { label: "Draft", tone: "neutral" },
  1: { label: "Open", tone: "open" },
  2: { label: "In progress", tone: "open" },
  3: { label: "Delivered", tone: "positive" },
};

/** Delivered but not invoiced — the same kind of derived state as Overdue and Expired. */
const TO_BILL: DocumentStatus = { label: "To bill", tone: "warning" };

/** Dolibarr order status 3: delivered, i.e. closed. */
const STATUS_DELIVERED = 3;

const OVERDUE: DocumentStatus = { label: "Overdue", tone: "negative" };
/**
 * Deliberately warning rather than negative: an unpaid invoice is money missing, an expired
 * proposal merely wants following up. Sharing the red would flatten that difference.
 */
const EXPIRED: DocumentStatus = { label: "Expired", tone: "warning" };
/** Dolibarr status 1: "validated and unpaid" for invoices, "open" for proposals. */
export const STATUS_OPEN = 1;

const UNKNOWN: DocumentStatus = { label: "Unknown", tone: "neutral" };

type DocumentFlags = {
  dueDate: Date | null;
  isOverdue: boolean;
  validUntil: Date | null;
  isExpired: boolean;
  isUnbilled: boolean;
};

/** Every kind sets only its own flags; the rest stay off. */
const NO_FLAGS: DocumentFlags = {
  dueDate: null,
  isOverdue: false,
  validUntil: null,
  isExpired: false,
  isUnbilled: false,
};

function base(raw: RawDocument, kind: DocumentKind, status: DocumentStatus, flags: DocumentFlags): DocumentSummary {
  return {
    id: num(raw.id),
    kind,
    ref: text(raw.ref) ?? "(no reference)",
    thirdpartyId: num(raw.socid),
    date: timestamp(raw.date),
    statusCode: num(raw.status),
    dueDate: flags.dueDate,
    isOverdue: flags.isOverdue,
    validUntil: flags.validUntil,
    isExpired: flags.isExpired,
    isUnbilled: flags.isUnbilled,
    ...amounts(raw),
    status,
  };
}

/**
 * With multi-currency enabled, total_ttc stays in the instance currency while multicurrency_code
 * names the document's own one. Pairing those two would label a euro amount as francs, so the
 * foreign amounts are used whenever a foreign currency is set.
 */
function amounts(raw: RawDocument): { totalHt: number; totalTtc: number; currency: string } {
  const usesForeignCurrency = num(raw.fk_multicurrency) !== 0;
  return {
    totalHt: usesForeignCurrency ? num(raw.multicurrency_total_ht) : num(raw.total_ht),
    totalTtc: usesForeignCurrency ? num(raw.multicurrency_total_ttc) : num(raw.total_ttc),
    currency: text(raw.multicurrency_code) ?? "EUR",
  };
}

export function toProposal(raw: RawDocument, today: Date = new Date()): DocumentSummary {
  const code = num(raw.status);
  const validUntil = timestamp(raw.fin_validite);
  // Only an open proposal expires: signing survives the deadline, a draft never had one.
  const isExpired = code === STATUS_OPEN && validUntil !== null && validUntil.getTime() < today.getTime();
  return base(raw, "proposal", isExpired ? EXPIRED : (PROPOSAL_STATUS[code] ?? UNKNOWN), {
    ...NO_FLAGS,
    validUntil,
    isExpired,
  });
}

export function toInvoice(raw: RawDocument, today: Date = new Date()): DocumentSummary {
  const code = num(raw.status);
  const dueDate = timestamp(raw.date_lim_reglement);
  const isOverdue = code === STATUS_OPEN && dueDate !== null && dueDate.getTime() < today.getTime();
  return base(raw, "invoice", isOverdue ? OVERDUE : (INVOICE_STATUS[code] ?? UNKNOWN), {
    ...NO_FLAGS,
    dueDate,
    isOverdue,
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days since the deadline passed, rounded down. Zero when not overdue or without a deadline. */
export function daysOverdue(dueDate: Date | null, today: Date = new Date()): number {
  if (dueDate === null) return 0;
  return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / MS_PER_DAY));
}

export type ThirdpartyDetail = {
  id: number;
  name: string;
  address: string | null;
  zip: string | null;
  town: string | null;
  url: string | null;
  vatNumber: string | null;
  registerCourt: string | null;
  registerNumber: string | null;
  legalForm: string | null;
  priceLevel: number | null;
  customerCode: string | null;
  notePublic: string | null;
  notePrivate: string | null;
};

export type ContactDetail = {
  id: number;
  civility: string | null;
  firstname: string | null;
  lastname: string;
  position: string | null;
  department: string | null;
  email: string | null;
  phonePro: string | null;
  phoneMobile: string | null;
  companyName: string | null;
  thirdpartyId: number | null;
  socialNetworks: Record<string, string> | null;
  notePublic: string | null;
  notePrivate: string | null;
};

export function toThirdpartyDetail(raw: RawThirdparty): ThirdpartyDetail {
  return {
    id: num(raw.id),
    name: text(raw.name) ?? "(unnamed)",
    address: text(raw.address),
    zip: text(raw.zip),
    town: text(raw.town),
    url: text(raw.url),
    vatNumber: text(raw.tva_intra),
    // idprof2 and idprof3 hold the German register court and number.
    registerCourt: text(raw.idprof2),
    registerNumber: text(raw.idprof3),
    legalForm: text(raw.forme_juridique),
    priceLevel: optionalNum(raw.price_level),
    customerCode: text(raw.code_client),
    notePublic: text(raw.note_public),
    notePrivate: text(raw.note_private),
  };
}

/** Dolibarr sends an empty array when no networks are maintained, and an object when they are. */
function socialNetworks(value: unknown): Record<string, string> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => [k, (v as string).trim()] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function toContactDetail(raw: RawContact): ContactDetail {
  const options = (raw.array_options ?? {}) as Record<string, unknown>;
  return {
    id: num(raw.id),
    civility: text(raw.civility_code),
    firstname: text(raw.firstname),
    lastname: text(raw.lastname) ?? "(unnamed)",
    position: text(raw.poste),
    department: text(options.options_abteilung),
    email: text(raw.email),
    phonePro: text(raw.phone_pro),
    phoneMobile: text(raw.phone_mobile),
    companyName: text(raw.socname),
    thirdpartyId: optionalNum(raw.socid),
    socialNetworks: socialNetworks(raw.socialnetworks),
    notePublic: text(raw.note_public),
    notePrivate: text(raw.note_private),
  };
}

export function toOrder(raw: RawDocument): DocumentSummary {
  const code = num(raw.status);
  // Only a delivered order is due for invoicing; flagging an open one would be premature.
  const isUnbilled = code === STATUS_DELIVERED && num(raw.billed) === 0;
  return base(raw, "order", isUnbilled ? TO_BILL : (ORDER_STATUS[code] ?? UNKNOWN), {
    ...NO_FLAGS,
    isUnbilled,
  });
}
