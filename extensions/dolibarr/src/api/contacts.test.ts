import { describe, expect, it, vi } from "vitest";
import type { Client } from "./client";
import { fetchCompanyContacts, fetchContact } from "./contacts";

function clientWith(rows: unknown[], single: unknown = {}) {
  const list = vi.fn(async () => rows);
  const one = vi.fn(async () => single);
  return { list, one, all: vi.fn() } as unknown as Client & {
    list: ReturnType<typeof vi.fn>;
    one: ReturnType<typeof vi.fn>;
  };
}

describe("fetchCompanyContacts", () => {
  it("filters via thirdparty_ids rather than sqlfilters", async () => {
    const client = clientWith([]);
    await fetchCompanyContacts(client, 373);
    const [path, params] = client.list.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/contacts");
    expect(params.thirdparty_ids).toBe(373);
    expect(JSON.stringify(params)).not.toContain("sqlfilters");
  });

  it("rejects a non-integer id before any request is made", async () => {
    const client = clientWith([]);
    await expect(fetchCompanyContacts(client, 1.5)).rejects.toThrow(/ID/);
    expect(client.list).not.toHaveBeenCalled();
  });

  it("returns normalised contacts", async () => {
    const client = clientWith([{ id: "2", lastname: "Bärlach", firstname: "Jonas", socid: "373" }]);
    const [contact] = await fetchCompanyContacts(client, 373);
    expect(contact.lastname).toBe("Bärlach");
    expect(contact.thirdpartyId).toBe(373);
  });

  it("sorts contacts by last name", async () => {
    const client = clientWith([
      { id: "1", lastname: "Zimmer", socid: "373" },
      { id: "2", lastname: "Adler", socid: "373" },
    ]);
    const contacts = await fetchCompanyContacts(client, 373);
    expect(contacts.map((c) => c.lastname)).toEqual(["Adler", "Zimmer"]);
  });
});

describe("fetchContact", () => {
  it("requests the single contact endpoint", async () => {
    const client = clientWith([], { id: "2", lastname: "Bärlach", socname: "Südlicht AG" });
    const contact = await fetchContact(client, 2);
    expect(client.one.mock.calls[0][0]).toBe("/contacts/2");
    expect(contact.companyName).toBe("Südlicht AG");
  });

  it("rejects a non-integer id", async () => {
    const client = clientWith([]);
    await expect(fetchContact(client, 0)).rejects.toThrow(/ID/);
  });
});
