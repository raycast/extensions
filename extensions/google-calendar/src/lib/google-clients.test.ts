import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { it } from "node:test";
import { createGoogleClients } from "./google-clients";

it("uses native fetch for authenticated People and Calendar requests, including API errors", async (t) => {
  const nativeFetch = globalThis.fetch;
  const fetchMock = t.mock.method(globalThis, "fetch", (...args: Parameters<typeof fetch>) => nativeFetch(...args));
  const requests: { path: string; method?: string; authorization?: string; body: string }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk.toString();
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    requests.push({ path, method: request.method, authorization: request.headers.authorization, body });
    response.setHeader("content-type", "application/json");
    if (path === "/v1/people/missing") {
      response.writeHead(404);
      response.end(JSON.stringify({ error: { message: "Contact not found" } }));
    } else if (path.endsWith("/events")) {
      response.end(JSON.stringify({ id: "test-event" }));
    } else {
      response.end(JSON.stringify({ results: [{ person: { names: [{ displayName: "Alice" }] } }] }));
    }
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const options = { rootUrl: `http://127.0.0.1:${address.port}/`, retry: false };
  const { people, calendar } = createGoogleClients("test-access-token");

  const [contacts, otherContacts] = await Promise.all([
    people.people.searchContacts({ query: "Alice", readMask: "names,emailAddresses" }, options),
    people.otherContacts.search({ query: "Alice", readMask: "names,emailAddresses" }, options),
  ]);
  assert.equal(contacts.data.results?.[0].person?.names?.[0].displayName, "Alice");
  assert.equal(otherContacts.data.results?.[0].person?.names?.[0].displayName, "Alice");

  const event = { summary: "Test meeting", start: { date: "2026-11-03" }, end: { date: "2026-11-04" } };
  const created = await calendar.events.insert({ calendarId: "primary", requestBody: event }, options);
  assert.equal(created.data.id, "test-event");
  assert.deepEqual(JSON.parse(requests.find((request) => request.method === "POST")?.body ?? ""), event);
  await assert.rejects(
    people.people.get({ resourceName: "people/missing", personFields: "names" }, options),
    /Contact not found/,
  );

  assert.equal(fetchMock.mock.callCount(), 4);
  assert.equal(requests.length, 4);
  assert.ok(requests.every((request) => request.authorization === "Bearer test-access-token"));
  assert.deepEqual(requests.map((request) => request.path).sort(), [
    "/calendar/v3/calendars/primary/events",
    "/v1/otherContacts:search",
    "/v1/people/missing",
    "/v1/people:searchContacts",
  ]);
});
