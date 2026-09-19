import { describe, expect, it, vi } from "vitest";
import type { Client } from "../api/client";
import { CONTACT_FIELDS, loadIndex, THIRDPARTY_FIELDS } from "./loadIndex";

function clientWith(thirdparties: unknown[], contacts: unknown[]): Client {
  return {
    list: vi.fn(),
    one: vi.fn(),
    all: vi.fn(async (path: string) => (path === "/thirdparties" ? thirdparties : contacts)),
  } as unknown as Client;
}

describe("loadIndex", () => {
  it("loads companies and contacts normalised", async () => {
    const client = clientWith(
      [{ id: "1", name: "Müller GmbH", client: "1" }],
      [{ id: "2", lastname: "Müller", firstname: "Anna", socid: "1" }],
    );
    const index = await loadIndex(client);
    expect(index.thirdparties[0].name).toBe("Müller GmbH");
    expect(index.thirdparties[0].relation).toBe("customer");
    expect(index.contacts[0].thirdpartyId).toBe(1);
  });

  it("loads both collections in parallel", async () => {
    const client = clientWith([], []);
    await loadIndex(client);
    expect(client.all).toHaveBeenCalledTimes(2);
  });
});

describe("field weights", () => {
  it("weights the company name highest", () => {
    expect(Math.max(...THIRDPARTY_FIELDS.map((f) => f.weight))).toBe(1);
  });

  it("weights the last name above the first name", () => {
    const [lastname, firstname] = CONTACT_FIELDS;
    expect(lastname.weight).toBeGreaterThan(firstname.weight);
  });
});
