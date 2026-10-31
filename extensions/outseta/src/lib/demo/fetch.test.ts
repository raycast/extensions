import { describe, expect, it } from "vitest";
import { createClient } from "../outseta/client";
import { AccountStage, CaseHistoryType, CaseStatus } from "../outseta/types";
import { buildDemoData, DEMO_AGENT_UID, DEMO_COMPANY_NAME } from "./data";
import { createDemoFetch } from "./fetch";

function demoClient(agentName = "Alex") {
  const data = buildDemoData(new Date("2026-10-26T12:00:00Z"));
  const client = createClient(
    { subdomain: "demo", apiKey: "any", secretKey: "any" },
    { agentName, fetch: createDemoFetch(data) },
  );
  return { data, client };
}

describe("demo data", () => {
  it("covers every account stage", () => {
    const stages = new Set(buildDemoData().accounts.map((a) => a.AccountStage));
    const all = Object.values(AccountStage).filter((v): v is AccountStage => typeof v === "number");
    expect([...stages].sort()).toEqual(all.sort());
  });

  it("links every person and case to records that exist", () => {
    const { accounts, people, cases } = buildDemoData();
    const accountUids = new Set(accounts.map((a) => a.Uid));
    const personUids = new Set(people.map((p) => p.Uid));
    for (const person of people) for (const uid of person.accountUids) expect(accountUids).toContain(uid);
    for (const c of cases) expect(personUids).toContain(c.FromPerson?.Uid);
  });

  it("only uses reserved example domains", () => {
    for (const person of buildDemoData().people) expect(person.Email).toMatch(/\.example$/);
  });
});

describe("createDemoFetch", () => {
  it("searches people by name or email and pages results", async () => {
    const { client } = demoClient();
    expect((await client.searchPeople({ query: "okafor" })).items.map((p) => p.FullName)).toEqual(["Grace Okafor"]);
    expect((await client.searchPeople({ query: "atlas.example" })).items).toHaveLength(3);
  });

  it("pages results with offset as a page index", async () => {
    const demoFetch = createDemoFetch(buildDemoData(new Date("2026-10-26T12:00:00Z")));
    const getPage = async (offset: number) => {
      const response = await demoFetch(`https://demo.outseta.com/api/v1/crm/people?limit=5&offset=${offset}`);
      return (await response.json()) as { items: Array<{ Uid: string }>; metadata: { total: number } };
    };
    const first = await getPage(0);
    const second = await getPage(1);
    expect(first.items).toHaveLength(5);
    expect(first.metadata.total).toBeGreaterThan(5);
    expect(second.items[0]?.Uid).not.toBe(first.items[0]?.Uid);
  });

  it("returns a person with their accounts and an account with its members", async () => {
    const { client } = demoClient();
    const person = await client.getPerson("person-lucas-martin");
    expect(person.PersonAccount?.map((link) => [link.Account?.Name, link.IsPrimary])).toEqual([
      ["Quartz Design Co", true],
      ["Northwind Studio", false],
    ]);

    const account = await client.getAccount("acct-atlas");
    expect(account.CurrentSubscription?.Quantity).toBe(14);
    expect(account.PersonAccount?.map((link) => link.Person?.FullName)).toContain("Grace Okafor");
  });

  it("applies the case filters the Support Cases command sends", async () => {
    const { client } = demoClient();
    const unassigned = await client.searchCases({ filter: { status: CaseStatus.Open, assignee: "unassigned" } });
    expect(unassigned.items.every((c) => c.Status === CaseStatus.Open && !c.AssignedToPersonClientIdentifier)).toBe(
      true,
    );

    const mine = await client.searchCases({ filter: { status: CaseStatus.Open, assignee: { uid: DEMO_AGENT_UID } } });
    expect(mine.items.map((c) => c.Subject)).toEqual([
      "Adding 6 more seats before Monday",
      "CSV export missing custom fields",
    ]);

    const closed = await client.searchCases({ filter: { status: CaseStatus.Closed } });
    expect(closed.items).toHaveLength(3);
    expect(closed.items[0]).not.toHaveProperty("CaseHistories");
  });

  it("stores replies in memory", async () => {
    const { client } = demoClient();
    const before = await client.getCase("case-webhook");
    await client.replyToCase(before, "Five times.");

    const after = await client.getCase("case-webhook");
    expect(after.CaseHistories?.at(-1)).toMatchObject({
      Type: CaseHistoryType.AgentReply,
      AgentName: "Alex",
      Comment: "<p>Five times.</p>",
    });
    expect(after.LastActivity! > before.LastActivity!).toBe(true);
  });

  it("signs replies without an agent name with the company name", async () => {
    const { client } = demoClient("");
    await client.replyToCase(await client.getCase("case-webhook"), "Five times.");
    const after = await client.getCase("case-webhook");
    expect(after.CaseHistories?.at(-1)?.AgentName).toBe(DEMO_COMPANY_NAME);
  });

  it("answers unknown records with 404", async () => {
    const { client } = demoClient();
    await expect(client.getPerson("nobody")).rejects.toMatchObject({ status: 404 });
  });
});
