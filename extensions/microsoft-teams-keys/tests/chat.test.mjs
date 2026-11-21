import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const loadBuiltin = createRequire(import.meta.url);

// Run the source with mocked Raycast and Teams I/O, without opening Teams or sending keystrokes.
function loadSource(file, imports, globals = {}) {
  const source = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      if (name in imports) return imports[name];
      if (name.startsWith("node:")) return loadBuiltin(name);
      throw new Error(`Unexpected import: ${name}`);
    },
    ...globals,
  });
  return exports;
}

function setup(savedContacts = [], preferences = {}) {
  const events = [];
  const api = {
    getPreferenceValues: () => ({ searchUnknownNames: true, searchTiming: "normal", ...preferences }),
    LocalStorage: { getItem: async () => JSON.stringify(savedContacts) },
  };
  const contacts = loadSource("contacts.ts", { "@raycast/api": api });
  const teams = loadSource(
    "teams.ts",
    { "@raycast/api": api, "@raycast/utils": {} },
    {
      setTimeout: (resolve, ms) => {
        events.push(["wait", ms]);
        resolve();
      },
    },
  );
  const chat = loadSource("chat.ts", {
    "@raycast/api": api,
    "./contacts": contacts,
    "./teams": {
      RETURN: teams.RETURN,
      TeamsError: teams.TeamsError,
      pause: teams.pause,
      activateTeams: async () => events.push(["activate"]),
      openInTeams: async (url) => events.push(["open", url]),
      press: async (key) => events.push(["press", key.code ?? key.char]),
      typeText: async (text) => events.push(["type", text]),
    },
  });
  return { ...chat, ...contacts, events };
}

const anna = { id: "1", name: "Anna", email: "anna@example.com" };
const annabelle = { id: "2", name: "Annabelle", email: "annabelle@example.com" };

for (const send of [true, false]) {
  test(`Teams search leaves a draft when send=${send}`, async () => {
    const { openChat, chatHud, events } = setup();
    const result = await openChat({ person: "Anan", message: "Hello", send });
    assert.equal(result.outcome, "search-draft");
    assert.match(chatHud(result), /Draft.*Check the recipient/);
    assert.equal(events.filter(([action, key]) => action === "press" && key === 36).length, 2);
    assert.deepEqual(events.at(-1), ["type", "Hello"]);
  });
}

test("ambiguous saved names leave a draft", async () => {
  const { openChat, events } = setup([anna, annabelle]);
  const result = await openChat({ person: "Ann", message: "Hello", send: true });
  assert.equal(result.outcome, "search-draft");
  assert.deepEqual(events.at(-1), ["type", "Hello"]);
  assert.equal(
    events.some(([action]) => action === "open"),
    false,
  );
});

test("search without a message asks the user to check the recipient", async () => {
  const { openChat, chatHud, events } = setup();
  const result = await openChat({ person: "Anan", send: true });
  assert.equal(result.outcome, "search-opened");
  assert.match(chatHud(result), /Check the recipient/);
  assert.deepEqual(
    events.filter(([action]) => action === "type"),
    [["type", "Anan"]],
  );
});

test("disabled search fails before interacting with Teams", async () => {
  const { openChat, events } = setup([], { searchUnknownNames: false });
  await assert.rejects(openChat({ person: "Anan", message: "Hello", send: true }), /neither an email/);
  assert.deepEqual(events, []);
});

for (const person of ["anna@example.com", "Anna", "ann"]) {
  test(`resolved recipient ${person} still sends`, async () => {
    const { openChat, chatHud, events } = setup([anna]);
    const result = await openChat({ person, message: "Hello & goodbye", send: true });
    assert.equal(result.outcome, "sent");
    assert.match(chatHud(result), /^Sent to /);
    assert.deepEqual(events[0], [
      "open",
      "https://teams.microsoft.com/l/chat/0/0?users=anna%40example.com&message=Hello%20%26%20goodbye",
    ]);
    assert.deepEqual(events.at(-1), ["press", 36]);
  });
}

test("resolved drafts and empty messages never press Return", async () => {
  for (const request of [
    { person: "Anna", message: "Hello", send: false },
    { person: "Anna", message: "   ", send: true },
  ]) {
    const { openChat, events } = setup([anna]);
    const result = await openChat(request);
    assert.equal(result.outcome, request.send ? "opened" : "draft");
    assert.equal(
      events.some(([action]) => action === "press"),
      false,
    );
  }
});

test("email send delay follows preset and custom Search Timing", async () => {
  for (const [preferences, delay] of [
    [{ searchTiming: "slow" }, 3240],
    [{ searchTiming: "custom", customSearchTiming: "2.5" }, 4500],
  ]) {
    const { openChat, events } = setup([], preferences);
    await openChat({ person: "anna@example.com", message: "Hello", send: true });
    assert.deepEqual(events.slice(-2), [
      ["wait", delay],
      ["press", 36],
    ]);
  }
});

test("contact resolution distinguishes unknown names and ambiguous matches", async () => {
  const { resolvePerson } = setup([anna, annabelle]);
  assert.equal((await resolvePerson("Anan")).reason, "unknown");
  assert.equal((await resolvePerson("Ann")).reason, "ambiguous");
  assert.equal((await resolvePerson("Anna")).email, anna.email);
});

test("duplicate exact names cannot fall through to a unique email prefix", async () => {
  const { resolvePerson } = setup([anna, { id: "2", name: "Anna", email: "other@example.com" }]);
  const result = await resolvePerson("Anna");
  assert.equal(result.kind, "search");
  assert.equal(result.reason, "ambiguous");
});
