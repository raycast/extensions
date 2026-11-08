import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const utils =
  "data:text/javascript," +
  encodeURIComponent(
    "export const calls = [], replies = [], getAvatarIcon = () => {};" +
      "export function runAppleScript(...args) { calls.push(args); return replies.shift(); }",
  );
const raycast = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { url: "data:text/javascript,export const Icon = {}, Image = {}, Color = {}", shortCircuit: true };
    }
    if (specifier === "@raycast/utils") return { url: utils, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { sendMessage } = await import("../src/helpers.ts");
const { buildRecipientSections, findMessageRecipient } = await import("../src/recipient-catalog.ts");
const { calls, replies } = await import(utils);
raycast.deregister();

function contact(id, displayName, number) {
  return {
    id,
    displayName,
    givenName: "",
    familyName: "",
    phoneNumbers: [{ number, countryCode: null }],
    emailAddresses: [],
    matchedChatIdentifiers: [],
    imageData: null,
  };
}

function recent(address, contactId) {
  return {
    guid: "iMessage;-;" + address,
    chat_identifier: address,
    displayName: address,
    service_name: "iMessage",
    is_group: false,
    contactId,
  };
}

test("a recent without a resolved contact leaves the saved name searchable", () => {
  const address = "+12025550123";
  const sections = buildRecipientSections([recent(address)], [contact("ada", "Ada", "+1 (202) 555-0123")]);
  assert.equal(sections.contacts[0]?.displayName, "Ada");
});

test("two contacts can share the last nine phone digits", () => {
  const sections = buildRecipientSections(
    [],
    [contact("ada", "Ada", "+12025550123"), contact("bea", "Bea", "+442025550123")],
  );
  assert.equal(sections.contacts.length, 2);
});

test("a contact quicklink still resolves after the contact moves to Recents", () => {
  const chat = recent("+12025550123", "ada");
  const { recents, contacts } = buildRecipientSections([chat], [contact("ada", "Ada", chat.chat_identifier)]);
  assert.equal(contacts.length, 0);
  assert.equal(findMessageRecipient(recents, "contact:ada")?.id, chat.guid);
  assert.equal(findMessageRecipient(recents, chat.guid)?.id, chat.guid);
  assert.equal(findMessageRecipient(recents, "contact:missing"), undefined);
});

test("message text and each type of recipient reach AppleScript as data", async () => {
  const text = 'Hello "there" 👋\nC:\\notes';
  const address = "+12025550123";
  for (const [target, recipient] of [
    [{ chat_guid: "iMessage;-;" + address }, "iMessage;-;" + address],
    [{ group_name: 'Group "A"' }, 'Group "A"'],
    [{}, address],
  ]) {
    calls.length = 0;
    replies.push("true", "Success");
    assert.equal(await sendMessage({ address, text, service_name: "iMessage", ...target }), "Success");
    const [script, args] = calls[1];
    assert.deepEqual(args, [recipient, text]);
    assert.ok(!script.includes(text));
    assert.ok(!script.includes(recipient));
  }
});
