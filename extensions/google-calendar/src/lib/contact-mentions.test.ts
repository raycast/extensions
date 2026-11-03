import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseContactMentionUri,
  readContactMention,
  toContactMentions,
  toContactMentionUri,
  toMentionPeople,
} from "./contact-mentions";

const alice = {
  names: [{ displayName: "Alice Smith" }],
  emailAddresses: [{ value: "Alice@Example.com" }, { value: "alice@home.example" }],
  photos: [{ url: "https://example.com/default.png", default: true }, { url: "https://example.com/alice.png" }],
};

const otherAlice = { names: [], emailAddresses: [{ value: "alice@example.com" }], photos: [] };
const noEmail = { names: [{ displayName: "Bob" }], emailAddresses: [], photos: [] };
const unnamed = { emailAddresses: [{ value: "carol@example.com" }] };

describe("toMentionPeople", () => {
  it("keeps only people with email addresses and only the fields mentions need", () => {
    assert.deepEqual(toMentionPeople([alice, noEmail, unnamed]), [
      {
        name: "Alice Smith",
        emails: ["Alice@Example.com", "alice@home.example"],
        photo: "https://example.com/alice.png",
      },
      { emails: ["carol@example.com"] },
    ]);
  });
});

describe("toContactMentions", () => {
  it("lists each address once, de-duplicating across contact sources", () => {
    const mentions = toContactMentions(toMentionPeople([alice, otherAlice, unnamed]), "al", "person");
    assert.deepEqual(mentions, [
      {
        title: "Alice Smith",
        uri: "google-calendar://contacts/alice%40example.com",
        description: "Alice@Example.com",
        icon: "https://example.com/alice.png",
      },
      {
        title: "Alice Smith",
        uri: "google-calendar://contacts/alice%40home.example",
        description: "alice@home.example",
        icon: "https://example.com/alice.png",
      },
      {
        title: "carol@example.com",
        uri: "google-calendar://contacts/carol%40example.com",
        description: "Email address",
        icon: "person",
      },
    ]);
  });

  it("offers a typed email address that no contact has, first", () => {
    const mentions = toContactMentions(toMentionPeople([unnamed]), " dave@example.com ", "person");
    assert.equal(mentions[0].uri, "google-calendar://contacts/dave%40example.com");
    assert.equal(mentions[0].title, "dave@example.com");
    assert.equal(mentions.length, 2);
  });

  it("does not duplicate a typed email address that is already a contact", () => {
    const mentions = toContactMentions(toMentionPeople([alice]), "ALICE@example.com", "person");
    assert.equal(mentions.length, 2);
    assert.equal(mentions[0].title, "Alice Smith");
  });

  it("ignores partial email addresses and caps results at 50", () => {
    assert.deepEqual(toContactMentions([], "dave@", "person"), []);
    const many = Array.from({ length: 60 }, (_, i) => ({ emails: [`user${i}@example.com`] }));
    assert.equal(toContactMentions(many, "", "person").length, 50);
  });
});

describe("parseContactMentionUri", () => {
  it("round-trips an email address", () => {
    assert.equal(parseContactMentionUri(toContactMentionUri("Alice+tag@Example.com")), "alice+tag@example.com");
  });

  it("rejects other URIs", () => {
    for (const uri of [
      "slack://users/T1/U1",
      "google-calendar://contacts/",
      "google-calendar://contacts/not-an-email",
      "google-calendar://contacts/%E0%A4%A",
    ]) {
      assert.throws(() => parseContactMentionUri(uri), /Invalid Google Calendar contact URI/);
    }
  });
});

describe("readContactMention", () => {
  it("returns the current contact details for the mentioned address", async () => {
    const queries: string[] = [];
    const resource = await readContactMention("google-calendar://contacts/alice%40example.com", async (query) => {
      queries.push(query);
      return [unnamed, alice];
    });
    assert.deepEqual(queries, ["alice@example.com"]);
    assert.equal(resource.mimeType, "application/json");
    assert.deepEqual(JSON.parse(resource.text), {
      name: "Alice Smith",
      email: "alice@example.com",
      otherEmails: ["alice@home.example"],
      inContacts: true,
    });
  });

  it("returns a bare email address that is not in the contacts", async () => {
    const resource = await readContactMention("google-calendar://contacts/dave%40example.com", async () => [alice]);
    assert.deepEqual(JSON.parse(resource.text), { email: "dave@example.com", inContacts: false });
  });
});
