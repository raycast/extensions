import { describe, expect, it } from "vitest";
import accountsList from "../../../fixtures/accounts-list.json";
import personDetail from "../../../fixtures/person-detail.json";
import {
  accountStageColor,
  adminUrl,
  caseMarkdown,
  formatDate,
  formatMoney,
  formatSubscriptionPrice,
  htmlToText,
  personName,
  plainTextToHtml,
  primaryAccount,
} from "./format";
import { Account, AccountStage, BillingRenewalTerm, CaseHistoryType, Person } from "./types";

describe("accountStageColor", () => {
  it.each([
    [AccountStage.Subscribing, "green"],
    [AccountStage.Trialing, "yellow"],
    [AccountStage.Cancelling, "orange"],
    [AccountStage.PastDue, "red"],
    [AccountStage.Expired, "red"],
    [undefined, "secondary"],
  ])("maps stage %s to %s", (stage, color) => {
    expect(accountStageColor(stage)).toBe(color);
  });
});

describe("formatSubscriptionPrice", () => {
  it("formats the fixture account's subscription", () => {
    const account = accountsList.items[0] as unknown as Account;
    expect(formatSubscriptionPrice(account.CurrentSubscription)).toBe("$35 / month");
  });

  it("falls back to the plan rate for the billing term", () => {
    expect(
      formatSubscriptionPrice({
        Uid: "s",
        BillingRenewalTerm: BillingRenewalTerm.Yearly,
        Plan: { Uid: "p", MonthlyRate: 35, AnnualRate: 312 },
      }),
    ).toBe("$312 / year");
  });

  it("shows quantity above one", () => {
    expect(formatSubscriptionPrice({ Uid: "s", Rate: 10, Quantity: 4, BillingRenewalTerm: 1 })).toBe("$10 × 4 / month");
  });

  it("handles one-time and missing subscriptions", () => {
    expect(formatSubscriptionPrice({ Uid: "s", Rate: 99, BillingRenewalTerm: BillingRenewalTerm.OneTime })).toBe(
      "$99 one time",
    );
    expect(formatSubscriptionPrice(null)).toBe("—");
    expect(formatSubscriptionPrice({ Uid: "s", Rate: 5 })).toBe("—");
  });
});

describe("formatMoney", () => {
  it("drops cents only for whole amounts", () => {
    expect(formatMoney(35)).toBe("$35");
    expect(formatMoney(35.5)).toBe("$35.50");
    expect(formatMoney(undefined)).toBe("—");
  });
});

describe("person helpers", () => {
  const person = personDetail as unknown as Person;

  it("finds the primary account", () => {
    expect(primaryAccount(person)?.Name).toBeTruthy();
  });

  it("builds a name from parts or falls back to email", () => {
    expect(personName({ Uid: "p", FirstName: "Ada", LastName: "Lovelace" })).toBe("Ada Lovelace");
    expect(personName({ Uid: "p", Email: "ada@example.com" })).toBe("ada@example.com");
    expect(personName(undefined)).toBe("—");
  });
});

describe("formatDate", () => {
  it("reads Outseta's zone-less timestamps as UTC", () => {
    expect(formatDate("2026-10-26T23:30:00")).toBe("Oct 26, 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("plainTextToHtml", () => {
  it("turns blank lines into paragraphs and single newlines into breaks", () => {
    expect(plainTextToHtml("Hi there,\nthanks.\n\nBest,\nJane\n")).toBe(
      "<p>Hi there,<br>thanks.</p><p>Best,<br>Jane</p>",
    );
  });

  it("escapes HTML", () => {
    expect(plainTextToHtml("<b>bold</b> & co")).toBe("<p>&lt;b&gt;bold&lt;/b&gt; &amp; co</p>");
  });
});

describe("adminUrl", () => {
  it("builds the admin deep links", () => {
    expect(adminUrl("acme", "person", "p1")).toBe("https://acme.outseta.com/#/app/crm/people/p1");
    expect(adminUrl("acme", "account", "a1")).toBe("https://acme.outseta.com/#/app/crm/accounts/a1");
    expect(adminUrl("acme", "case", "c1")).toBe("https://acme.outseta.com/#/app/support/tickets/c1");
  });
});

describe("htmlToText", () => {
  it("keeps paragraph and line breaks and decodes entities", () => {
    expect(htmlToText("<p>Hi&nbsp;there,<br>thanks &amp; bye</p><p>&lt;3</p>")).toBe("Hi there,\nthanks & bye\n\n<3");
  });

  it("drops empty padding paragraphs the admin editor adds", () => {
    expect(htmlToText("<p>Hey there</p>\n<p>&nbsp;</p>\n<p>&nbsp;</p>")).toBe("Hey there");
  });

  it("returns empty text for missing html", () => {
    expect(htmlToText(null)).toBe("");
  });
});

describe("caseMarkdown", () => {
  it("renders the opening message, then replies and notes in time order", () => {
    const markdown = caseMarkdown({
      Uid: "c1",
      Subject: "I need help",
      Body: "<p>Please help me</p>",
      SubmittedDateTime: "2026-10-26T20:02:55",
      FromPerson: { Uid: "p1", FullName: "Ada Lovelace" },
      CaseHistories: [
        {
          Uid: "h2",
          Type: CaseHistoryType.Note,
          AgentName: "Grace",
          Comment: "<p>Check billing</p>",
          HistoryDateTime: "2026-10-26T20:10:00",
        },
        {
          Uid: "h1",
          Type: CaseHistoryType.AgentReply,
          AgentName: "Grace",
          Comment: "<p>On it</p>",
          HistoryDateTime: "2026-10-26T20:05:00",
        },
        {
          Uid: "h3",
          Type: CaseHistoryType.Assigned,
          Comment: "Grace assigned this ticket to Grace",
          HistoryDateTime: "2026-10-26T20:11:00",
        },
      ],
    });

    expect(markdown).toContain("## I need help");
    expect(markdown).toContain("**Ada Lovelace**");
    expect(markdown.indexOf("On it")).toBeLessThan(markdown.indexOf("Check billing"));
    expect(markdown).toContain("📝 **Note by Grace**");
    expect(markdown).toContain("_Grace assigned this ticket to Grace");
  });

  it("keeps single line breaks from chat transcripts", () => {
    const markdown = caseMarkdown({ Uid: "c1", Body: "Bot: Hi<br>User: Hello<br>Bot: Bye" });
    expect(markdown).toContain("Bot: Hi  \nUser: Hello  \nBot: Bye");
  });

  it("labels automatic replies that have no agent name", () => {
    const markdown = caseMarkdown({
      Uid: "c1",
      CaseHistories: [{ Uid: "h1", Type: CaseHistoryType.AutoReply, Comment: "<p>Thanks!</p>" }],
    });
    expect(markdown).toContain("**Auto-reply**");
  });

  it("falls back for a case without subject or body", () => {
    const markdown = caseMarkdown({ Uid: "c1" });
    expect(markdown).toContain("## (no subject)");
    expect(markdown).toContain("_No message._");
  });
});
