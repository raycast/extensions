import { Account, Case, CaseHistoryType, Person } from "../outseta/types";
import { buildDemoData, DEMO_COMPANY_NAME, DemoAccount, DemoData, DemoPerson } from "./data";

// A stand-in for fetch that answers the Outseta endpoints the client uses from in-memory demo
// data, so the real client code runs unchanged. Replies are kept in memory and never sent.

type Json = object;

function omit<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

export function createDemoFetch(data: DemoData = buildDemoData()): typeof fetch {
  const accountsByUid = new Map(data.accounts.map((a) => [a.Uid, a]));

  function personWithAccounts(person: DemoPerson): Person {
    return {
      ...omit(person, "accountUids"),
      PersonAccount: person.accountUids.map((uid, index) => ({
        Uid: `${person.Uid}-${uid}`,
        IsPrimary: index === 0,
        Account: accountsByUid.get(uid),
      })),
    };
  }

  function accountWithMembers(account: DemoAccount): Account {
    const members = data.people.filter((p) => p.accountUids.includes(account.Uid));
    return {
      ...account,
      PersonAccount: members.map((person) => ({
        Uid: `${person.Uid}-${account.Uid}`,
        IsPrimary: person.accountUids[0] === account.Uid,
        Person: { Uid: person.Uid, Email: person.Email, FullName: person.FullName },
      })),
    };
  }

  function page<T>(items: T[], search: URLSearchParams): Json {
    const limit = Number(search.get("limit") ?? 25);
    const offset = Number(search.get("offset") ?? 0);
    return {
      metadata: { limit, offset, total: items.length },
      items: items.slice(offset * limit, (offset + 1) * limit),
    };
  }

  const matches = (query: string | null, ...values: Array<string | null | undefined>) =>
    !query || values.some((value) => value?.toLowerCase().includes(query.toLowerCase()));

  function listCases(search: URLSearchParams): Case[] {
    const status = search.get("Status");
    const assignee = search.get("AssignedToPersonClientIdentifier");
    const unassigned = search.get("AssignedToPersonClientIdentifier__isnull") === "true";
    const query = search.get("q");
    return data.cases
      .filter((c) => !status || c.Status === Number(status))
      .filter((c) => !assignee || c.AssignedToPersonClientIdentifier === assignee)
      .filter((c) => !unassigned || !c.AssignedToPersonClientIdentifier)
      .filter((c) => matches(query, c.Subject, c.FromPerson?.Email, c.FromPerson?.FullName))
      .sort((a, b) => (b.LastActivity ?? "").localeCompare(a.LastActivity ?? ""))
      .map((c) => omit(c, "Body", "CaseHistories"));
  }

  function reply(caseUid: string, body: { Comment?: string; AgentName?: string }) {
    const supportCase = data.cases.find((c) => c.Uid === caseUid);
    if (!supportCase) return undefined;
    const now = new Date().toISOString().slice(0, 19);
    supportCase.CaseHistories = [
      ...(supportCase.CaseHistories ?? []),
      {
        Uid: `history-reply-${Date.now()}`,
        HistoryDateTime: now,
        Type: CaseHistoryType.AgentReply,
        AgentName: body.AgentName || DEMO_COMPANY_NAME,
        Comment: body.Comment ?? "",
      },
    ];
    supportCase.LastActivity = now;
    return {};
  }

  function route(method: string, path: string, search: URLSearchParams, body: unknown): Json | null | undefined {
    const [, resource, collection, uid, sub] = path.split("/");
    const key = `${method} ${resource}/${collection}${uid ? "/:uid" : ""}${sub ? `/${sub}` : ""}`;
    const query = search.get("q");
    switch (key) {
      case "GET crm/people":
        return page(
          data.people.filter((p) => matches(query, p.Email, p.FullName)).map((p) => omit(p, "accountUids")),
          search,
        );
      case "GET crm/people/:uid": {
        const person = data.people.find((p) => p.Uid === uid);
        return person && personWithAccounts(person);
      }
      case "GET crm/accounts":
        return page(
          data.accounts
            .filter((a) => matches(query, a.Name))
            .map(({ Uid, Name, AccountStage, AccountStageLabel }) => ({
              Uid,
              Name,
              AccountStage,
              AccountStageLabel,
            })),
          search,
        );
      case "GET crm/accounts/:uid": {
        const account = accountsByUid.get(uid ?? "");
        return account && accountWithMembers(account);
      }
      case "GET support/cases":
        return page(listCases(search), search);
      case "GET support/cases/:uid":
        return data.cases.find((c) => c.Uid === uid);
      case "POST support/cases/:uid/replies":
        return reply(uid ?? "", body as { Comment?: string; AgentName?: string });
      default:
        return undefined;
    }
  }

  return async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname
      .replace(/^\/api\/v1/, "")
      .split("/")
      .map(decodeURIComponent)
      .join("/");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const result = route(init?.method ?? "GET", path, url.searchParams, body);
    if (result === undefined) return new Response("", { status: 404 });
    if (result === null) return new Response("", { status: 500 });
    // The real API answers writes with an empty body.
    return new Response(init?.method === "POST" ? "" : JSON.stringify(result), { status: 200 });
  };
}
