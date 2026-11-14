import { plainTextToHtml } from "../outseta/format";
import {
  Account,
  AccountStage,
  BillingRenewalTerm,
  Case,
  CaseHistory,
  CaseHistoryType,
  CaseSource,
  CaseStatus,
  Person,
  Plan,
} from "../outseta/types";

// Sample data for the "demo" subdomain: screenshots, Store reviewers, and development without
// touching a real account. Everything is invented; emails use the reserved .example TLD.
// Dates are relative to `now` so the demo never looks stale.

export const DEMO_AGENT_UID = "demo-agent-me";
/** Signs replies sent without an agent name, as Outseta does with the real company name. */
export const DEMO_COMPANY_NAME = "Demo Company";
const OTHER_AGENT_UID = "demo-agent-sam";

export interface DemoAccount extends Account {
  Uid: string;
}

export interface DemoPerson extends Person {
  Uid: string;
  /** Account uids; the first is primary. */
  accountUids: string[];
}

export interface DemoData {
  plans: Plan[];
  accounts: DemoAccount[];
  people: DemoPerson[];
  cases: Case[];
}

const stageLabels: Record<AccountStage, string> = {
  [AccountStage.Trialing]: "Trialing",
  [AccountStage.Subscribing]: "Subscribing",
  [AccountStage.Cancelling]: "Cancelling",
  [AccountStage.Expired]: "Expired",
  [AccountStage.TrialExpired]: "Trial Expired",
  [AccountStage.PastDue]: "Past Due",
  [AccountStage.CancellingTrial]: "Cancelling Trial",
  [AccountStage.Paused]: "Paused",
  [AccountStage.Created]: "Created",
};

export function buildDemoData(now = new Date()): DemoData {
  // Zone-less UTC timestamps, like the API returns.
  const at = (days: number, hours = 0) =>
    new Date(now.getTime() + (days * 24 + hours) * 3_600_000).toISOString().slice(0, 19);
  const ago = (days: number, hours = 0) => at(-days, -hours);

  const plans = {
    starter: { Uid: "plan-starter", Name: "Starter", MonthlyRate: 19, AnnualRate: 190 },
    pro: { Uid: "plan-pro", Name: "Pro", MonthlyRate: 49, AnnualRate: 490 },
    team: { Uid: "plan-team", Name: "Team (per seat)", MonthlyRate: 12, AnnualRate: 120 },
    lifetime: { Uid: "plan-lifetime", Name: "Lifetime", OneTimeRate: 299 },
  } satisfies Record<string, Plan>;

  let stripeCount = 0;
  function account(
    slug: string,
    name: string,
    stage: AccountStage,
    plan: Plan | undefined,
    options: {
      term?: BillingRenewalTerm;
      quantity?: number;
      startedDaysAgo: number;
      renewsInDays?: number;
      endsInDays?: number;
      revenue: number;
      lastLoginDaysAgo?: number;
    },
  ): DemoAccount {
    const term = options.term ?? BillingRenewalTerm.Monthly;
    const rate =
      plan &&
      {
        [BillingRenewalTerm.Monthly]: plan.MonthlyRate,
        [BillingRenewalTerm.Yearly]: plan.AnnualRate,
        [BillingRenewalTerm.Quarterly]: plan.QuarterlyRate,
        [BillingRenewalTerm.OneTime]: plan.OneTimeRate,
      }[term];
    return {
      Uid: `acct-${slug}`,
      Created: ago(options.startedDaysAgo),
      Name: name,
      AccountStage: stage,
      AccountStageLabel: stageLabels[stage],
      LifetimeRevenue: options.revenue,
      LastLoginDateTime: options.lastLoginDaysAgo === undefined ? null : ago(options.lastLoginDaysAgo, 3),
      StripeId: plan ? `cus_fake${++stripeCount}` : null,
      CurrentSubscription: plan
        ? {
            Uid: `sub-${slug}`,
            Plan: plan,
            BillingRenewalTerm: term,
            Quantity: options.quantity ?? 1,
            Rate: rate ?? null,
            StartDate: ago(options.startedDaysAgo),
            RenewalDate: options.renewsInDays === undefined ? null : at(options.renewsInDays),
            EndDate: options.endsInDays === undefined ? null : at(options.endsInDays),
          }
        : null,
    };
  }

  const { Monthly, Yearly, OneTime } = BillingRenewalTerm;
  const accounts = [
    account("northwind", "Northwind Studio", AccountStage.Subscribing, plans.pro, {
      startedDaysAgo: 731,
      renewsInDays: 12,
      revenue: 1176,
      lastLoginDaysAgo: 0,
    }),
    account("halcyon", "Halcyon Labs", AccountStage.Subscribing, plans.team, {
      term: Yearly,
      quantity: 8,
      startedDaysAgo: 400,
      renewsInDays: 330,
      revenue: 1920,
      lastLoginDaysAgo: 1,
    }),
    account("bluebird", "Bluebird Bakery", AccountStage.Trialing, plans.starter, {
      startedDaysAgo: 4,
      renewsInDays: 10,
      revenue: 0,
      lastLoginDaysAgo: 0,
    }),
    account("cedar", "Cedar & Pine Woodworks", AccountStage.PastDue, plans.pro, {
      startedDaysAgo: 210,
      renewsInDays: -3,
      revenue: 294,
      lastLoginDaysAgo: 9,
    }),
    account("orbit", "Orbit Analytics", AccountStage.Cancelling, plans.pro, {
      term: Yearly,
      startedDaysAgo: 340,
      endsInDays: 25,
      revenue: 490,
      lastLoginDaysAgo: 14,
    }),
    account("quartz", "Quartz Design Co", AccountStage.Subscribing, plans.starter, {
      term: Yearly,
      startedDaysAgo: 95,
      renewsInDays: 270,
      revenue: 190,
      lastLoginDaysAgo: 2,
    }),
    account("atlas", "Atlas Freight", AccountStage.Subscribing, plans.team, {
      quantity: 14,
      startedDaysAgo: 520,
      renewsInDays: 5,
      revenue: 2856,
      lastLoginDaysAgo: 0,
    }),
    account("lumen", "Lumen Photography", AccountStage.Subscribing, plans.lifetime, {
      term: OneTime,
      startedDaysAgo: 610,
      revenue: 299,
      lastLoginDaysAgo: 30,
    }),
    account("tidepool", "Tidepool Games", AccountStage.CancellingTrial, plans.pro, {
      startedDaysAgo: 9,
      endsInDays: 5,
      revenue: 0,
      lastLoginDaysAgo: 6,
    }),
    account("riverstone", "Riverstone Legal", AccountStage.Paused, plans.pro, {
      term: Monthly,
      startedDaysAgo: 480,
      revenue: 735,
      lastLoginDaysAgo: 41,
    }),
    account("juniper", "Juniper Health", AccountStage.Expired, plans.starter, {
      startedDaysAgo: 300,
      endsInDays: -60,
      revenue: 152,
      lastLoginDaysAgo: 62,
    }),
    account("maple", "Maple Street Books", AccountStage.TrialExpired, plans.starter, {
      startedDaysAgo: 40,
      endsInDays: -26,
      revenue: 0,
      lastLoginDaysAgo: 27,
    }),
    account("willow", "Willow Yoga", AccountStage.Subscribing, plans.starter, {
      startedDaysAgo: 150,
      renewsInDays: 21,
      revenue: 95,
      lastLoginDaysAgo: 3,
    }),
    account("fennel", "Fennel Kitchen", AccountStage.Created, undefined, {
      startedDaysAgo: 1,
      revenue: 0,
    }),
  ];

  function person(
    first: string,
    last: string,
    domain: string,
    accountSlugs: string[],
    extra: { title?: string; lastLoginDaysAgo?: number; createdDaysAgo?: number } = {},
  ): DemoPerson {
    return {
      Uid: `person-${first.toLowerCase()}-${last.toLowerCase()}`,
      Created: ago(extra.createdDaysAgo ?? 200),
      FirstName: first,
      LastName: last,
      FullName: `${first} ${last}`,
      Email: `${first.toLowerCase()}@${domain}.example`,
      Title: extra.title ?? "",
      ProfileImageS3Url: null,
      LastLoginDateTime: extra.lastLoginDaysAgo === undefined ? null : ago(extra.lastLoginDaysAgo, 2),
      accountUids: accountSlugs.map((slug) => `acct-${slug}`),
    };
  }

  const people = [
    person("Maya", "Chen", "northwind", ["northwind"], { title: "Founder", lastLoginDaysAgo: 0 }),
    person("Tomás", "Herrera", "northwind", ["northwind"], { title: "Designer", lastLoginDaysAgo: 4 }),
    person("Priya", "Raman", "halcyon", ["halcyon"], { title: "Head of Operations", lastLoginDaysAgo: 1 }),
    person("Jonas", "Becker", "halcyon", ["halcyon"], { title: "Engineer", lastLoginDaysAgo: 2 }),
    person("Aiko", "Tanaka", "halcyon", ["halcyon"], { title: "Engineer", lastLoginDaysAgo: 8 }),
    person("Rosa", "Delgado", "bluebird", ["bluebird"], { title: "Owner", lastLoginDaysAgo: 0, createdDaysAgo: 4 }),
    person("Ethan", "Brooks", "cedarpine", ["cedar"], { title: "Owner", lastLoginDaysAgo: 9 }),
    person("Leila", "Haddad", "orbit", ["orbit"], { title: "CTO", lastLoginDaysAgo: 14 }),
    person("Noah", "Fischer", "quartz", ["quartz"], { title: "Creative Director", lastLoginDaysAgo: 2 }),
    person("Grace", "Okafor", "atlas", ["atlas"], { title: "VP Logistics", lastLoginDaysAgo: 0 }),
    person("Samuel", "Osei", "atlas", ["atlas"], { title: "Dispatcher", lastLoginDaysAgo: 1 }),
    person("Hannah", "Kowalski", "atlas", ["atlas"], { lastLoginDaysAgo: 5 }),
    person("Diego", "Moreno", "lumen", ["lumen"], { title: "Photographer", lastLoginDaysAgo: 30 }),
    person("Freya", "Lindqvist", "tidepool", ["tidepool"], { title: "Producer", lastLoginDaysAgo: 6 }),
    person("Olivia", "Grant", "riverstone", ["riverstone"], { title: "Partner", lastLoginDaysAgo: 41 }),
    person("Arjun", "Mehta", "juniper", ["juniper"], { lastLoginDaysAgo: 62 }),
    person("Clara", "Novak", "maplestreet", ["maple"], { title: "Manager", lastLoginDaysAgo: 27 }),
    person("Imani", "Clarke", "willow", ["willow"], { title: "Instructor", lastLoginDaysAgo: 3 }),
    person("Ben", "Carter", "fennel", ["fennel"], { createdDaysAgo: 1 }),
    // A consultant who belongs to two accounts.
    person("Lucas", "Martin", "freelance", ["quartz", "northwind"], { title: "Consultant", lastLoginDaysAgo: 11 }),
    // People with no account: newsletter sign-ups and support-only contacts.
    person("Zoe", "Adams", "mail", [], { createdDaysAgo: 2 }),
    person("Omar", "Farouk", "mail", [], { createdDaysAgo: 0 }),
  ];

  const contact = (first: string) => {
    const found = people.find((p) => p.FirstName === first);
    if (!found) throw new Error(`Demo person ${first} missing`);
    return { Uid: found.Uid, Email: found.Email, FullName: found.FullName };
  };

  type Message = [daysAgo: number, hoursAgo: number, type: CaseHistoryType, text: string, agent?: string];
  let historyCount = 0;
  function supportCase(
    slug: string,
    from: string,
    subject: string,
    options: {
      source: CaseSource;
      status?: CaseStatus;
      assignedTo?: string;
      opened: [daysAgo: number, hoursAgo: number];
      body: string;
      messages?: Message[];
    },
  ): Case {
    const histories: CaseHistory[] = (options.messages ?? []).map(([days, hours, type, text, agent]) => ({
      Uid: `history-${++historyCount}`,
      HistoryDateTime: ago(days, hours),
      Type: type,
      AgentName: agent ?? null,
      Comment: text ? plainTextToHtml(text) : null,
    }));
    const times = [ago(...options.opened), ...histories.map((h) => h.HistoryDateTime ?? "")].sort();
    return {
      Uid: `case-${slug}`,
      Subject: subject,
      Body: plainTextToHtml(options.body),
      Status: options.status ?? CaseStatus.Open,
      Source: options.source,
      SubmittedDateTime: ago(...options.opened),
      LastActivity: times[times.length - 1],
      AssignedToPersonClientIdentifier: options.assignedTo ?? null,
      FromPerson: contact(from),
      CaseHistories: histories,
    };
  }

  const { PersonReply, AgentReply, AutoReply, Note, Assigned, Closed } = CaseHistoryType;
  const cases = [
    supportCase("card-declined", "Ethan", "Card declined, can't update payment method", {
      source: CaseSource.Email,
      opened: [0, 3],
      body: "Hi,\n\nI got an email saying my payment failed. When I try to update my card on the billing page it just spins.\n\nEthan",
      messages: [[0, 3, AutoReply, "Thanks for reaching out! We usually reply within a few hours."]],
    }),
    supportCase("seats", "Grace", "Adding 6 more seats before Monday", {
      source: CaseSource.Email,
      assignedTo: DEMO_AGENT_UID,
      opened: [1, 5],
      body: "Hello! We're onboarding a new depot next week. Can we add 6 seats now and have them prorated?\n\nThanks,\nGrace",
      messages: [
        [1, 4, Assigned, "Assigned to Alex"],
        [
          1,
          2,
          AgentReply,
          "Hi Grace,\n\nAbsolutely. Seats are prorated to your renewal date. Want me to add them for you?",
          "Alex",
        ],
        [0, 6, PersonReply, "Yes please, that would be great. Same card as usual."],
      ],
    }),
    supportCase("export", "Priya", "CSV export missing custom fields", {
      source: CaseSource.Chat,
      assignedTo: DEMO_AGENT_UID,
      opened: [2, 1],
      body: "The CSV export doesn't include our custom fields (Region, Cost center). Is that expected?",
      messages: [
        [2, 0, Assigned, "Assigned to Alex"],
        [
          1,
          20,
          Note,
          "Reproduced. Custom fields only export when they're visible in the list view. Filed internally.",
          "Alex",
        ],
        [
          1,
          19,
          AgentReply,
          "Thanks Priya. Quick workaround: show the columns in the list view, then export again.",
          "Alex",
        ],
      ],
    }),
    supportCase("trial-extension", "Rosa", "Can I extend my trial a few days?", {
      source: CaseSource.Website,
      opened: [0, 1],
      body: "Hi there! Loving it so far, but our launch slipped a week. Any chance of a few extra trial days?\n\nRosa @ Bluebird",
    }),
    supportCase("sso", "Leila", "Question about SSO before we cancel", {
      source: CaseSource.Email,
      assignedTo: OTHER_AGENT_UID,
      opened: [3, 2],
      body: "We're evaluating whether to stay. Is SAML SSO on the roadmap? It's the main reason we're leaving.",
      messages: [
        [3, 0, Assigned, "Assigned to Sam"],
        [2, 22, AgentReply, "Hi Leila, it's planned for early next year. I'll keep you posted.", "Sam"],
      ],
    }),
    supportCase("invoice", "Olivia", "Invoice with our VAT number", {
      source: CaseSource.Email,
      opened: [5, 4],
      body: "Could you reissue last quarter's invoices with our VAT number on them? GB 123 4567 89.",
    }),
    supportCase("webhook", "Jonas", "Webhook retries", {
      source: CaseSource.Chat,
      opened: [0, 0],
      body: "How many times do you retry a webhook that returns 500? Our endpoint was down for an hour last night.",
    }),
    supportCase("login-loop", "Noah", "Stuck in a login loop on Safari", {
      source: CaseSource.Website,
      status: CaseStatus.Closed,
      opened: [8, 2],
      body: "Every time I sign in on Safari it sends me back to the login page.",
      messages: [
        [
          8,
          0,
          AgentReply,
          'Hi Noah, could you try with "Prevent cross-site tracking" turned off and let me know?',
          "Alex",
        ],
        [7, 20, PersonReply, "That fixed it, thanks!"],
        [7, 19, Closed, "Closed by Alex"],
      ],
    }),
    supportCase("refund", "Arjun", "Refund for unused months", {
      source: CaseSource.Email,
      status: CaseStatus.Closed,
      opened: [64, 0],
      body: "We closed the clinic and won't use the service anymore. Can we get a refund for the remaining months?",
      messages: [
        [63, 20, AgentReply, "Sorry to hear that, Arjun. I've refunded the last payment and cancelled renewal.", "Sam"],
        [63, 19, Closed, "Closed by Sam"],
      ],
    }),
    supportCase("custom-domain", "Diego", "Custom domain SSL pending", {
      source: CaseSource.Twitter,
      status: CaseStatus.Closed,
      opened: [20, 5],
      body: 'My custom domain has said "SSL pending" for two days.',
      messages: [
        [20, 1, AgentReply, "DNS was still pointing at the old host. Updated instructions sent by email.", "Alex"],
        [19, 2, Closed, "Closed by Alex"],
      ],
    }),
    supportCase("partnership", "Omar", "Partnership opportunity!!!", {
      source: CaseSource.Email,
      status: CaseStatus.Spam,
      opened: [0, 8],
      body: "Dear Sir/Madam, we offer 10,000 backlinks for $49. Reply now.",
    }),
  ];

  return { plans: Object.values(plans), accounts, people, cases };
}
