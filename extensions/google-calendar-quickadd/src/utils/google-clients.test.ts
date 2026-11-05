import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { it } from "node:test";
import { createCalendarClient } from "./google-clients";

it("uses native fetch for authenticated Calendar requests, including API errors", async (t) => {
  const nativeFetch = globalThis.fetch;
  const fetchMock = t.mock.method(globalThis, "fetch", (...args: Parameters<typeof fetch>) => nativeFetch(...args));
  const requests: { path: string; method?: string; authorization?: string; query: string }[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push({
      path: url.pathname,
      method: request.method,
      authorization: request.headers.authorization,
      query: url.searchParams.get("text") ?? "",
    });
    response.setHeader("content-type", "application/json");
    if (url.pathname.endsWith("/missing/events/quickAdd")) {
      response.writeHead(404);
      response.end(JSON.stringify({ error: { message: "Calendar not found" } }));
    } else {
      response.end(JSON.stringify({ id: "test-event" }));
    }
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const options = { rootUrl: `http://127.0.0.1:${address.port}/`, retry: false };
  const calendar = createCalendarClient("test-access-token");

  const created = await calendar.events.quickAdd({ calendarId: "primary", text: "Lunch tomorrow at noon" }, options);
  assert.equal(created.data.id, "test-event");
  await assert.rejects(
    calendar.events.quickAdd({ calendarId: "missing", text: "Lunch" }, options),
    /Calendar not found/,
  );

  assert.equal(fetchMock.mock.callCount(), 2);
  assert.ok(requests.every((request) => request.authorization === "Bearer test-access-token"));
  assert.deepEqual(
    requests.map((request) => [request.method, request.path, request.query]),
    [
      ["POST", "/calendar/v3/calendars/primary/events/quickAdd", "Lunch tomorrow at noon"],
      ["POST", "/calendar/v3/calendars/missing/events/quickAdd", "Lunch"],
    ],
  );
});
