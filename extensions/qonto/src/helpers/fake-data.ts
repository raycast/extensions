import { endOfMonth, subDays, subMonths } from "date-fns";
import { BankAccount } from "../types/bank-account";
import { Membership } from "../types/membership";
import { Organization } from "../types/organization";
import { Paginate } from "../types/paginate";
import { Transaction, TransactionType } from "../types/transaction";
import { transaction, TransactionId, buildTransactionHistoryWithBalance } from "./fake-data-helpers";
import { match } from "ts-pattern";

const TODAY = new Date();

// ==========
// Fake data API response
// ==========

const fakeBankAccount1: BankAccount = {
  slug: "orga-account-1234",
  iban: "FR7616798000010000005663951",
  bic: "TRZOFR21XXX",
  currency: "EUR",
  name: "Main account",
  status: "active",
  balance: 713000.5,
  balance_cents: 71300050,
  authorized_balance: 1000,
  authorized_balance_cents: 100000,
  updated_at: subDays(TODAY, 1).toISOString(),
};

const fakeBankAccount2: BankAccount = {
  slug: "orga-account-2345",
  iban: "FR7616798000010000005663952",
  bic: "TRZOFR21XXX",
  currency: "EUR",
  name: "Marketing account",
  status: "active",
  balance: 487200.0,
  balance_cents: 48720000,
  authorized_balance: 1000,
  authorized_balance_cents: 100000,
  updated_at: subDays(TODAY, 1).toISOString(),
};

export const fakeOrganization: { organization: Organization } = {
  organization: {
    slug: "makerside-4242",
    legal_name: "Makerside SAS",
    locale: "fr",
    legal_share_capital: 15000,
    legal_country: "FR",
    legal_registration_date: "2017-10-01",
    legal_form: "SAS",
    legal_address: "1 Avenue Automation 59000 Lille",
    legal_sector: "6201Z",
    contract_signed_at: "2020-08-20T07:27:45.434Z",
    legal_number: "12A34FC5",
    bank_accounts: [fakeBankAccount1, fakeBankAccount2],
  },
};

export const fakeMemberships: { memberships: Membership[]; meta: Paginate } = {
  memberships: [
    {
      id: "1",
      first_name: "Christophe",
      last_name: "Ribeiro",
      role: "owner",
    },
    {
      id: "2",
      first_name: "Pierre",
      last_name: "Ribeiro",
      role: "admin",
    },
    {
      id: "3",
      first_name: "Arnaud",
      last_name: "Musk",
      role: "admin",
    },
  ],
  meta: {
    current_page: 1,
    next_page: null,
    prev_page: null,
    total_pages: 1,
    total_count: 1,
    per_page: 100,
  },
};

// ==========
// END transaction helpers
// ==========

const transactionIds: (id: string) => Record<TransactionId, string> = (id) => ({
  id,
  transaction_id: `transaction-${id}`,
});

const transactionWhen = (date: Date) => ({
  settled_at: date.toISOString(),
  emitted_at: date.toISOString(),
  updated_at: date.toISOString(),
});

const transactionWho = {
  CHRISTOPHE: { initiator_id: fakeMemberships.memberships[0].id },
  PIERRE: { initiator_id: fakeMemberships.memberships[1].id },
  ARNAUD: { initiator_id: fakeMemberships.memberships[2].id },
  NOBODY: { initiator_id: null },
};

const transactionCard = {
  CHRISTOPHE: { card_last_digits: "1234" },
  PIERRE: { card_last_digits: "2345" },
  ARNAUD: { card_last_digits: "3456" },
  NOBODY: { card_last_digits: null },
};

const transactionType: (
  type: TransactionType,
  card?: keyof typeof transactionCard
) => Record<"operation_type" | "card_last_digits", any> = (type, card = "CHRISTOPHE") => {
  return match(type)
    .with("card", () => ({ operation_type: "card", card_last_digits: transactionCard[card] }))
    .otherwise((type) => ({ operation_type: type, card_last_digits: null }));
};

const transactionCommons = {
  reference: null,
  label_ids: [],
  attachment_lost: false,
  attachment_required: true,
  status: "completed",
};

// ==========
// END transaction helpers
// ==========

const transactionWhat = buildTransactionHistoryWithBalance(fakeBankAccount1, [
  transaction["1PASSWORD"],
  transaction["PAYFIT"],
  transaction["MAKERSIDE"],
  transaction["GITHUB"],
  transaction["ALAN"],
  transaction["INCOME_STRIPE"],
  transaction["LINEAR"],
  transaction["NOTION"],
  transaction["SALARY_CHRIS"],
  transaction["SALARY_PIERRE"],
  transaction["SALARY_ARNAUD"],
]);

export const fakeMainAccountTransactions: { transactions: Transaction[]; meta: Paginate } = {
  transactions: [
    {
      // 1PASSWORD
      ...transactionIds("101"),
      ...transactionWhat[1],
      ...transactionWhen(subDays(TODAY, 0)),
      ...transactionWho["CHRISTOPHE"],
      ...transactionType("card", "CHRISTOPHE"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: [],
      note: null,
    },
    {
      // PAYFIT
      ...transactionIds("102"),
      ...transactionWhat[2],
      ...transactionWhen(subDays(TODAY, 1)),
      ...transactionWho["NOBODY"],
      ...transactionType("direct_debit"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: [],
      note: null,
    },
    {
      // MAKERSIDE
      ...transactionIds("103"),
      ...transactionWhat[3],
      ...transactionWhen(subDays(TODAY, 1)),
      ...transactionWho["PIERRE"],
      ...transactionType("card", "PIERRE"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: ["A1"],
      note: null,
    },
    {
      // GITHUB
      ...transactionIds("104"),
      ...transactionWhat[4],
      ...transactionWhen(subDays(TODAY, 1)),
      ...transactionWho["PIERRE"],
      ...transactionType("card", "PIERRE"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: ["A1"],
      note: null,
    },
    {
      // ALAN
      ...transactionIds("105"),
      ...transactionWhat[5],
      ...transactionWhen(subDays(TODAY, 1)),
      ...transactionWho["NOBODY"],
      ...transactionType("direct_debit"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: ["A1"],
      note: null,
    },
    {
      // INCOME STRIPE
      ...transactionIds("106"),
      ...transactionWhat[6],
      ...transactionWhen(subDays(TODAY, 7)),
      ...transactionWho["NOBODY"],
      ...transactionType("income"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: [],
      note: null,
    },
    {
      // SALARY CHRIS
      ...transactionIds("109"),
      ...transactionWhat[9],
      ...transactionWhen(endOfMonth(subMonths(TODAY, 1))),
      ...transactionWho["PIERRE"],
      ...transactionType("transfer"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: [],
      note: null,
    },
    {
      // SALARY PIERRE
      ...transactionIds("110"),
      ...transactionWhat[10],
      ...transactionWhen(endOfMonth(subMonths(TODAY, 1))),
      ...transactionWho["PIERRE"],
      ...transactionType("transfer"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: [],
      note: null,
    },
    {
      // SALARY ARNAUD
      ...transactionIds("111"),
      ...transactionWhat[11],
      ...transactionWhen(endOfMonth(subMonths(TODAY, 1))),
      ...transactionWho["PIERRE"],
      ...transactionType("transfer"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: [],
      note: null,
    },
    {
      // LINEAR
      ...transactionIds("107"),
      ...transactionWhat[7],
      ...transactionWhen(subDays(endOfMonth(subMonths(TODAY, 1)), 7)),
      ...transactionWho["CHRISTOPHE"],
      ...transactionType("card", "CHRISTOPHE"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: ["A1"],
      note: null,
    },
    {
      // NOTION
      ...transactionIds("108"),
      ...transactionWhat[8],
      ...transactionWhen(subDays(endOfMonth(subMonths(TODAY, 1)), 10)),
      ...transactionWho["CHRISTOPHE"],
      ...transactionType("card", "CHRISTOPHE"),
      ...transactionCommons,
      status: "completed",
      attachment_ids: ["A1"],
      note: null,
    },
  ],
  meta: {
    current_page: 1,
    next_page: null,
    prev_page: null,
    total_pages: 1,
    total_count: 1,
    per_page: 100,
  },
};
